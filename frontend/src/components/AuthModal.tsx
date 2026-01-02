import {
  AppleFilled,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  GoogleOutlined,
  LeftOutlined,
  MobileOutlined,
  WindowsFilled,
} from "@ant-design/icons";
import {
  App,
  Button,
  Divider,
  Input,
  Modal,
  Space,
  Typography,
} from "antd";
import { useState, useRef, useEffect } from "react";
import { authService, User } from "../services/authService";
import styles from "./AuthModal.module.css";

interface AuthModalProps {
  open: boolean;
  onCancel: () => void;
  onLoginSuccess: (user: User) => void;
}

export default function AuthModal({
  open,
  onCancel,
  onLoginSuccess,
}: AuthModalProps) {
  const { message } = App.useApp();
  const [step, setStep] = useState<
    "login" | "signup" | "phone" | "phone-verify"
  >("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup interval on unmount or when countdown reaches 0
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleEmailContinue = () => {
    if (email.trim()) {
      setStep("signup");
    }
  };

  // Initialize Google Sign-In when component mounts and modal opens
  useEffect(() => {
    if (!open) return;
    
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    if (googleClientId && typeof window !== 'undefined') {
      // Wait for Google SDK to load
      const initGoogleSignIn = () => {
        if ((window as any).google) {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleSignIn,
          });
        } else {
          // Retry after a short delay if SDK not loaded yet
          setTimeout(initGoogleSignIn, 100);
        }
      };
      
      initGoogleSignIn();
    }
  }, [open]);

  // Handle Google Sign-In callback (receives ID token)
  const handleGoogleSignIn = async (response: any) => {
    try {
      setLoading(true);
      
      if (!response.credential) {
        message.error("Failed to get Google credentials");
        return;
      }

      // Send ID token to backend
      const result = await authService.googleLogin(response.credential);
      
      if (result.success && result.user) {
        message.success("Successfully signed in with Google!");
        onLoginSuccess(result.user);
        onCancel();
      } else {
        message.error(result.message || "Failed to sign in with Google");
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      message.error("An error occurred during Google sign-in");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (
    provider: "google" | "apple" | "microsoft" | "phone"
  ) => {
    // Generate OAuth state for CSRF protection
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const defaultRedirect = `${window.location.origin}/auth/callback`;

    if (provider === "google") {
      const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

      if (!googleClientId) {
        message.error("Google Client ID not configured");
        return;
      }

      // Check if Google SDK is loaded
      if (typeof window === 'undefined' || !(window as any).google) {
        message.error("Google Sign-In SDK is loading. Please wait a moment and try again.");
        return;
      }

      // Trigger Google Sign-In by clicking a hidden Google button
      try {
        // Create a hidden Google Sign-In button and trigger it
        const buttonContainer = document.getElementById('google-signin-button-hidden');
        if (buttonContainer) {
          // Render button if not already rendered
          if (!buttonContainer.hasChildNodes()) {
            (window as any).google.accounts.id.renderButton(buttonContainer, {
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
            });
          }
          // Trigger the button click after a short delay
          setTimeout(() => {
            const googleButton = buttonContainer.querySelector('div[role="button"]') as HTMLElement;
            if (googleButton) {
              googleButton.click();
            } else {
              // Fallback: try One Tap
              (window as any).google.accounts.id.prompt();
            }
          }, 100);
        } else {
          // Fallback: try One Tap
          (window as any).google.accounts.id.prompt();
        }
      } catch (error) {
        console.error("Google Sign-In error:", error);
        message.error("Failed to initialize Google Sign-In");
      }
    } else if (provider === "apple") {
      const appleClientId = import.meta.env.VITE_APPLE_CLIENT_ID;
      const appleRedirect =
        import.meta.env.VITE_APPLE_REDIRECT_URI || defaultRedirect;

      // If Apple Client ID is configured, use real OAuth
      if (appleClientId) {
        const params = new URLSearchParams({
          client_id: appleClientId,
          redirect_uri: appleRedirect,
          response_type: "code id_token",
          scope: "name email",
          response_mode: "form_post",
          state,
        });
        window.location.href = `https://appleid.apple.com/auth/authorize?${params.toString()}`;
      } else {
        // Demo mode: simulate Apple login
        message.loading("Connecting to Apple...", 1.5).then(() => {
          const demoUser: User = {
            id: `apple_${Date.now()}`,
            email: `demo_apple_user@icloud.com`,
            createdAt: new Date().toISOString(),
          };
          message.success("Successfully logged in with Apple! (Demo mode)");
          onLoginSuccess(demoUser);
          onCancel();
        });
      }
    } else if (provider === "phone") {
      setStep("phone");
    } else {
      message.info(`${provider} login not configured yet`);
    }
  };

  const handleBackToLogin = () => {
    // Clear timer when going back
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStep("login");
    setPassword("");
    setPhoneNumber("");
    setVerificationCode("");
    setCountdown(0);
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      message.error("Please enter a valid phone number");
      return;
    }
    setLoading(true);
    try {
      // Simulate sending verification code (in production, call real SMS API)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStep("phone-verify");
      message.success("Verification code sent! (Demo: use 123456)");
      // Clear any existing timer before starting new one
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Start countdown
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      message.error("Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      message.error("Please enter the verification code");
      return;
    }
    setLoading(true);
    try {
      // Demo: accept "123456" as valid code
      if (verificationCode === "123456") {
        // Create a demo user for phone login
        const demoUser: User = {
          id: `phone_${Date.now()}`,
          email: `${phoneNumber}@phone.demo`,
          createdAt: new Date().toISOString(),
        };
        message.success("Successfully logged in!");
        onLoginSuccess(demoUser);
        onCancel();
        // Reset form
        handleBackToLogin();
      } else {
        message.error("Invalid verification code. Demo code is: 123456");
      }
    } catch {
      message.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignupContinue = async () => {
    if (!email || !password) return;

    setLoading(true);
    try {
      // 1. Try to register
      let response = await authService.register(email, password);

      // 2. If user exists, try to login with the same credentials
      if (!response.success && response.message === "User already exists") {
        response = await authService.login(email, password);
      }

      if (response.success && response.user) {
        message.success("Successfully logged in!");
        onLoginSuccess(response.user);
        onCancel();
        // Reset form
        setStep("login");
        setEmail("");
        setPassword("");
      } else {
        message.error(response.message || "Authentication failed");
      }
    } catch {
      message.error("An error occurred during authentication");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => {
        // Clear timer when closing modal
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        onCancel();
        setStep("login");
        setEmail("");
        setPassword("");
        setPhoneNumber("");
        setVerificationCode("");
        setCountdown(0);
      }}
      footer={null}
      centered
      width={
        step === "signup" || step === "phone" || step === "phone-verify"
          ? 480
          : 400
      }
      className={styles.authModal}
      styles={{ mask: { backgroundColor: "rgba(0, 0, 0, 0.05)" } }}
      closable={step === "login"}
    >
      {step === "phone" ? (
        <div className={styles.signupContainer}>
          <div className={styles.logoContainer}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              className={styles.backButton}
              onClick={handleBackToLogin}
            />
          </div>
          <div className={styles.signupContent}>
            <Typography.Title level={2} className={styles.signupTitle}>
              Continue with phone
            </Typography.Title>
            <Typography.Text className={styles.signupSubtitle}>
              Enter your phone number to receive a verification code.
            </Typography.Text>

            <div className={styles.signupForm}>
              <div className={styles.emailFieldWrapper}>
                <Typography.Text className={styles.fieldLabel}>
                  Phone number
                </Typography.Text>
                <Input
                  size="large"
                  placeholder="+1 (555) 123-4567"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onPressEnter={handleSendCode}
                  className={styles.emailInput}
                />
              </div>

              <Button
                type="primary"
                block
                size="large"
                className={styles.continueBtn}
                onClick={handleSendCode}
                disabled={!phoneNumber.trim()}
                loading={loading}
              >
                Send verification code
              </Button>
            </div>
          </div>
        </div>
      ) : step === "phone-verify" ? (
        <div className={styles.signupContainer}>
          <div className={styles.logoContainer}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              className={styles.backButton}
              onClick={() => setStep("phone")}
            />
          </div>
          <div className={styles.signupContent}>
            <Typography.Title level={2} className={styles.signupTitle}>
              Enter verification code
            </Typography.Title>
            <Typography.Text className={styles.signupSubtitle}>
              We sent a code to {phoneNumber}
            </Typography.Text>

            <div className={styles.signupForm}>
              <div className={styles.emailFieldWrapper}>
                <Typography.Text className={styles.fieldLabel}>
                  Verification code
                </Typography.Text>
                <Input
                  size="large"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  onPressEnter={handleVerifyCode}
                  className={styles.emailInput}
                  maxLength={6}
                />
              </div>

              <Button
                type="primary"
                block
                size="large"
                className={styles.continueBtn}
                onClick={handleVerifyCode}
                disabled={!verificationCode.trim()}
                loading={loading}
              >
                Verify and sign in
              </Button>

              <div style={{ textAlign: "center", marginTop: 16 }}>
                {countdown > 0 ? (
                  <Typography.Text type="secondary">
                    Resend code in {countdown}s
                  </Typography.Text>
                ) : (
                  <Button
                    type="link"
                    onClick={handleSendCode}
                    loading={loading}
                  >
                    Resend code
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : step === "login" ? (
        <div className={styles.container}>
          <Typography.Title level={2} className={styles.title}>
            Log in or sign up
          </Typography.Title>
          <Typography.Text className={styles.subtitle}>
            You'll get smarter responses and can upload files, images, and more.
          </Typography.Text>

          <Space
            direction="vertical"
            size={12}
            className={styles.socialButtons}
          >
            {/* Hidden Google Sign-In button container */}
            <div id="google-signin-button-hidden" style={{ display: 'none' }}></div>
            <Button
              block
              size="large"
              icon={<GoogleOutlined />}
              className={styles.socialBtn}
              onClick={() => handleSocialLogin("google")}
              loading={loading}
            >
              Continue with Google
            </Button>
            <Button
              block
              size="large"
              icon={<AppleFilled />}
              className={styles.socialBtn}
              onClick={() => handleSocialLogin("apple")}
            >
              Continue with Apple
            </Button>
            <Button
              block
              size="large"
              icon={<WindowsFilled />}
              className={styles.socialBtn}
              onClick={() => handleSocialLogin("microsoft")}
            >
              Continue with Microsoft
            </Button>
            <Button
              block
              size="large"
              icon={<MobileOutlined />}
              className={styles.socialBtn}
              onClick={() => handleSocialLogin("phone")}
            >
              Continue with phone
            </Button>
          </Space>

          <Divider className={styles.divider}>OR</Divider>

          <div className={styles.emailSection}>
            <Input
              type="email"
              size="large"
              placeholder="Email address"
              className={styles.emailInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onPressEnter={handleEmailContinue}
            />
            <Button
              type="primary"
              block
              size="large"
              className={styles.continueBtn}
              onClick={handleEmailContinue}
            >
              Continue
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.signupContainer}>
          <div className={styles.logoContainer}>
            <Button
              type="text"
              icon={<LeftOutlined />}
              className={styles.backButton}
              onClick={handleBackToLogin}
            />
          </div>
          <div className={styles.signupContent}>
            <Typography.Title level={2} className={styles.signupTitle}>
              Create your account
            </Typography.Title>
            <Typography.Text className={styles.signupSubtitle}>
              Set your password for MELO to continue.
            </Typography.Text>

            <div className={styles.signupForm}>
              <div className={styles.emailFieldWrapper}>
                <Typography.Text className={styles.fieldLabel}>
                  Email address
                </Typography.Text>
                <div className={styles.emailFieldWithEdit}>
                  <Input
                    size="large"
                    value={email}
                    readOnly
                    className={styles.emailInputReadonly}
                  />
                  <Button
                    type="link"
                    icon={<EditOutlined />}
                    className={styles.editButton}
                    onClick={handleBackToLogin}
                  >
                    Edit
                  </Button>
                </div>
              </div>

              <div className={styles.passwordFieldWrapper}>
                <Typography.Text className={styles.fieldLabel}>
                  Password
                </Typography.Text>
                <Input
                  size="large"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onPressEnter={handleSignupContinue}
                  className={styles.passwordInput}
                  suffix={
                    <Button
                      type="text"
                      icon={
                        showPassword ? (
                          <EyeOutlined />
                        ) : (
                          <EyeInvisibleOutlined />
                        )
                      }
                      onClick={() => setShowPassword(!showPassword)}
                      className={styles.eyeButton}
                    />
                  }
                />
              </div>

              <Button
                type="primary"
                block
                size="large"
                className={styles.continueBtn}
                onClick={handleSignupContinue}
                disabled={!password.trim()}
                loading={loading}
              >
                Continue
              </Button>
            </div>

            <div className={styles.footerLinks}>
              <Button type="link" className={styles.footerLink}>
                Terms of Use
              </Button>
              <span className={styles.footerDivider}>|</span>
              <Button type="link" className={styles.footerLink}>
                Privacy Policy
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
