import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  useTheme,
  useMediaQuery,
  Fade,
  Slide
} from '@mui/material';
import {
  SmartToy as BotIcon
} from '@mui/icons-material';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

/**
 * Authentication page that switches between login and register
 * @param {Object} props - Component props
 * @param {Function} props.onAuthSuccess - Callback for successful authentication
 */
const AuthPage = ({ onAuthSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isLogin, setIsLogin] = useState(true);

  /**
   * Toggles between login and register
   */
  const toggleAuthMode = () => {
    setIsLogin(prev => !prev);
  };

  /**
   * Handles authentication success
   */
  const handleAuthSuccess = () => {
    if (onAuthSuccess) {
      onAuthSuccess();
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: theme.palette.mode === 'dark'
          ? `radial-gradient(ellipse at top, ${theme.palette.primary.main}15 0%, ${theme.palette.background.default} 50%), 
             radial-gradient(ellipse at bottom, ${theme.palette.secondary.main}15 0%, ${theme.palette.background.default} 50%)`
          : `radial-gradient(ellipse at top, ${theme.palette.primary.main}08 0%, ${theme.palette.background.default} 50%), 
             radial-gradient(ellipse at bottom, ${theme.palette.secondary.main}08 0%, ${theme.palette.background.default} 50%)`,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: theme.palette.mode === 'dark'
            ? 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
            : 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000000" fill-opacity="0.02"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: 0.5,
        }
      }}
    >
      <Container 
        maxWidth={isLogin ? "sm" : "md"} 
        sx={{ 
          position: 'relative', 
          zIndex: 1,
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 4 }
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: { xs: 3, sm: 4 },
          }}
        >
          {/* Header with logo - only if not mobile */}
          {!isMobile && (
            <Fade in timeout={800}>
              <Box sx={{ textAlign: 'center', mb: { xs: 1, sm: 2 } }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 2,
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '50%',
                      background: `linear-gradient(145deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
                      border: `2px solid ${theme.palette.primary.main}30`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <BotIcon
                      sx={{
                        fontSize: 32,
                        color: theme.palette.primary.main,
                      }}
                    />
                  </Box>
                  
                  <Typography
                    variant="h2"
                    component="h1"
                    sx={{
                      fontWeight: 800,
                      fontSize: { sm: '2.5rem', md: '3rem' },
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    XandAI
                  </Typography>
                </Box>
                
                <Typography
                  variant="h5"
                  color="text.secondary"
                  sx={{
                    mb: 1,
                    fontSize: { sm: '1.1rem', md: '1.25rem' },
                    fontWeight: 500,
                    opacity: 0.9,
                  }}
                >
                  Your intelligent AI assistant
                </Typography>
                
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{
                    maxWidth: 500,
                    mx: 'auto',
                    fontSize: '1rem',
                    opacity: 0.7,
                    lineHeight: 1.6,
                  }}
                >
                  {isLogin 
                    ? 'Sign in to your account to continue chatting with the most advanced AI'
                    : 'Join thousands of users and discover the power of artificial intelligence'
                  }
                </Typography>
              </Box>
            </Fade>
          )}

          {/* Authentication form */}
          <Box 
            sx={{ 
              width: '100%', 
              display: 'flex', 
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <Slide
              direction={isLogin ? 'right' : 'left'}
              in
              timeout={600}
              key={isLogin ? 'login' : 'register'}
            >
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                {isLogin ? (
                  <LoginForm
                    onSwitchToRegister={toggleAuthMode}
                    onLoginSuccess={handleAuthSuccess}
                  />
                ) : (
                  <RegisterForm
                    onSwitchToLogin={toggleAuthMode}
                    onRegisterSuccess={handleAuthSuccess}
                  />
                )}
              </Box>
            </Slide>
          </Box>

          {/* Features - only if not mobile and not login */}
          {!isMobile && !isLogin && (
            <Fade in timeout={1400}>
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'center',
                  gap: 4,
                  mt: 2,
                  flexWrap: 'wrap',
                  maxWidth: 600,
                }}
              >
                {[
                  { icon: '🤖', title: 'Advanced AI', desc: 'Powered by Ollama' },
                  { icon: '💬', title: 'Smart Chat', desc: 'Natural conversations' },
                  { icon: '🚀', title: 'Fast & Secure', desc: 'Privacy guaranteed' },
                ].map((feature, index) => (
                  <Box
                    key={index}
                    sx={{
                      textAlign: 'center',
                      minWidth: 120,
                      opacity: 0.8,
                      transition: 'opacity 0.3s ease',
                      '&:hover': { opacity: 1 }
                    }}
                  >
                    <Typography variant="h4" sx={{ mb: 0.5 }}>
                      {feature.icon}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {feature.desc}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Fade>
          )}

          {/* Footer */}
          <Fade in timeout={1600}>
            <Box sx={{ textAlign: 'center', mt: 'auto', pt: 2 }}>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  opacity: 0.6,
                  fontSize: '0.8rem'
                }}
              >
                © 2024 XandAI. Built with ❤️ for an incredible AI experience.
              </Typography>
            </Box>
          </Fade>
        </Box>
      </Container>

      {/* Decorative effects */}
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          right: '10%',
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `linear-gradient(45deg, ${theme.palette.primary.main}20, transparent)`,
          filter: 'blur(20px)',
          animation: 'float 6s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-20px)' },
          },
        }}
      />
      
      <Box
        sx={{
          position: 'absolute',
          bottom: '15%',
          left: '15%',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: `linear-gradient(45deg, ${theme.palette.secondary.main}20, transparent)`,
          filter: 'blur(15px)',
          animation: 'float 8s ease-in-out infinite reverse',
        }}
      />
    </Box>
  );
};

export default AuthPage;