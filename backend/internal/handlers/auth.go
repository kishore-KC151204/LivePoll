package handlers

import (
  "bytes"
  "context"
  "crypto/rand"
  "crypto/sha256"
  "encoding/hex"
  "encoding/json"
  "errors"
  "fmt"
  "net/http"
  "strings"
  "time"

  "github.com/gin-gonic/gin"
  "github.com/golang-jwt/jwt/v5"
  "go.mongodb.org/mongo-driver/bson"
  "go.mongodb.org/mongo-driver/mongo"
  "golang.org/x/crypto/bcrypt"

  "livepoll-backend/internal/db"
  "livepoll-backend/internal/models"
)

type AuthHandler struct {
  Store        *db.MongoStore
  JWTSecret    string
  FrontendURL  string
  ResendAPIKey string
  EmailFrom    string
}

type signupRequest struct {
  Name string `json:"name" binding:"required,min=2,max=60"`
  Email string `json:"email" binding:"required,email"`
  Password string `json:"password" binding:"required,min=8,max=72"`
}
type loginRequest struct {
  Email string `json:"email" binding:"required,email"`
  Password string `json:"password" binding:"required"`
}
type forgotRequest struct { Email string `json:"email" binding:"required,email"` }
type resetRequest struct {
  Token string `json:"token" binding:"required"`
  Password string `json:"password" binding:"required,min=8,max=72"`
}

func (h *AuthHandler) Signup(c *gin.Context) {
  var req signupRequest
  if err := c.ShouldBindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()}); return }
  req.Email = strings.ToLower(strings.TrimSpace(req.Email))
  hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
  if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"failed to process password"}); return }
  user := models.User{Name: strings.TrimSpace(req.Name), Email:req.Email, PasswordHash:string(hash), CreatedAt:time.Now().UTC()}
  _, err = h.Store.Users.InsertOne(context.Background(), user)
  if mongo.IsDuplicateKeyError(err) { c.JSON(http.StatusConflict, gin.H{"error":"an account with that email already exists"}); return }
  if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"failed to create account"}); return }
  c.JSON(http.StatusCreated, gin.H{"message":"account created"})
}

func (h *AuthHandler) Login(c *gin.Context) {
  var req loginRequest
  if err := c.ShouldBindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":err.Error()}); return }
  email := strings.ToLower(strings.TrimSpace(req.Email))
  var user models.User
  err := h.Store.Users.FindOne(context.Background(), bson.M{"email":email}).Decode(&user)
  if errors.Is(err,mongo.ErrNoDocuments) { c.JSON(http.StatusUnauthorized, gin.H{"error":"invalid email or password"}); return }
  if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"login failed"}); return }
  if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash),[]byte(req.Password)); err != nil {
    c.JSON(http.StatusUnauthorized, gin.H{"error":"invalid email or password"}); return
  }
  token, err := h.issueToken(user.ID.Hex())
  if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error":"failed to issue token"}); return }
  c.JSON(http.StatusOK, gin.H{"token":token,"user":gin.H{"id":user.ID.Hex(),"name":user.Name,"email":user.Email}})
}

func (h *AuthHandler) ForgotPassword(c *gin.Context) {
  var req forgotRequest
  if err := c.ShouldBindJSON(&req); err != nil { c.JSON(http.StatusBadRequest, gin.H{"error":err.Error()}); return }
  email := strings.ToLower(strings.TrimSpace(req.Email))
  var user models.User
  err := h.Store.Users.FindOne(context.Background(), bson.M{"email":email}).Decode(&user)
  generic := gin.H{"message":"If an account exists for that email, a password reset link has been sent."}
  if errors.Is(err,mongo.ErrNoDocuments) { c.JSON(http.StatusOK,generic); return }
  if err != nil { c.JSON(http.StatusInternalServerError,gin.H{"error":"password reset request failed"}); return }
  if h.ResendAPIKey == "" || h.EmailFrom == "" {
    c.JSON(http.StatusServiceUnavailable,gin.H{"error":"password reset email is not configured yet"}); return
  }
  raw := make([]byte,32)
  if _,err:=rand.Read(raw); err!=nil { c.JSON(http.StatusInternalServerError,gin.H{"error":"could not create reset token"}); return }
  token := hex.EncodeToString(raw)
  sum := sha256.Sum256([]byte(token))
  hash := hex.EncodeToString(sum[:])
  expires := time.Now().UTC().Add(30*time.Minute)
  _,err = h.Store.Users.UpdateOne(context.Background(),bson.M{"_id":user.ID},bson.M{"$set":bson.M{"resetTokenHash":hash,"resetTokenExpires":expires}})
  if err != nil { c.JSON(http.StatusInternalServerError,gin.H{"error":"could not create reset request"}); return }
  resetURL := strings.TrimRight(h.FrontendURL,"/")+"/reset-password?token="+token
  if err:=h.sendResetEmail(user.Email,resetURL); err!=nil {
    c.JSON(http.StatusInternalServerError,gin.H{"error":"could not send reset email"}); return
  }
  c.JSON(http.StatusOK,generic)
}

func (h *AuthHandler) ResetPassword(c *gin.Context) {
  var req resetRequest
  if err:=c.ShouldBindJSON(&req); err!=nil { c.JSON(http.StatusBadRequest,gin.H{"error":err.Error()}); return }
  sum:=sha256.Sum256([]byte(req.Token))
  hash:=hex.EncodeToString(sum[:])
  var user models.User
  err:=h.Store.Users.FindOne(context.Background(),bson.M{"resetTokenHash":hash,"resetTokenExpires":bson.M{"$gt":time.Now().UTC()}}).Decode(&user)
  if errors.Is(err,mongo.ErrNoDocuments) { c.JSON(http.StatusBadRequest,gin.H{"error":"reset link is invalid or expired"}); return }
  if err!=nil { c.JSON(http.StatusInternalServerError,gin.H{"error":"password reset failed"}); return }
  passwordHash,err:=bcrypt.GenerateFromPassword([]byte(req.Password),bcrypt.DefaultCost)
  if err!=nil { c.JSON(http.StatusInternalServerError,gin.H{"error":"failed to process password"}); return }
  _,err=h.Store.Users.UpdateOne(context.Background(),bson.M{"_id":user.ID},bson.M{"$set":bson.M{"passwordHash":string(passwordHash)},"$unset":bson.M{"resetTokenHash":"","resetTokenExpires":""}})
  if err!=nil { c.JSON(http.StatusInternalServerError,gin.H{"error":"password reset failed"}); return }
  c.JSON(http.StatusOK,gin.H{"message":"password updated successfully"})
}

func (h *AuthHandler) sendResetEmail(to,resetURL string) error {
  payload:=map[string]any{
    "from":h.EmailFrom,"to":[]string{to},"subject":"Reset your LivePoll password",
    "html":fmt.Sprintf("<div style='font-family:Arial,sans-serif;max-width:560px;margin:auto'><h2>Reset your LivePoll password</h2><p>This link expires in 30 minutes.</p><p><a href='%s' style='background:#7c5cff;color:white;padding:12px 18px;border-radius:8px;text-decoration:none'>Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>",resetURL),
  }
  body,_:=json.Marshal(payload)
  req,_:=http.NewRequest(http.MethodPost,"https://api.resend.com/emails",bytes.NewReader(body))
  req.Header.Set("Authorization","Bearer "+h.ResendAPIKey)
  req.Header.Set("Content-Type","application/json")
  resp,err:=http.DefaultClient.Do(req)
  if err!=nil{return err}
  defer resp.Body.Close()
  if resp.StatusCode<200||resp.StatusCode>=300{return fmt.Errorf("email provider returned %s",resp.Status)}
  return nil
}

func (h *AuthHandler) issueToken(userID string)(string,error){
  claims:=jwt.MapClaims{"sub":userID,"iat":time.Now().Unix(),"exp":time.Now().Add(24*time.Hour).Unix()}
  token:=jwt.NewWithClaims(jwt.SigningMethodHS256,claims)
  return token.SignedString([]byte(h.JWTSecret))
}

func (h *AuthHandler) Logout(c *gin.Context){ c.JSON(http.StatusOK,gin.H{"message":"logged out"}) }
