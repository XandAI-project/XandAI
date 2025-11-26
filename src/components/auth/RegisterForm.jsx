import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  useMediaQuery,
  Grid,
  Fade,
  Slide,
  Card,
  CardContent,
  Divider,
  Chip
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PersonAdd as PersonAddIcon,
  ArrowForward as ArrowForwardIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Register form component
 * @param {Object} props - Component props
 * @param {Function} props.onSwitchToLogin - Callback to switch to login
 * @param {Function} props.onRegisterSuccess - Callback for successful registration
 */
const RegisterForm = ({ onSwitchToLogin, onRegisterSuccess }) => {
  const theme = useTheme();
  const { register, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    theme: 'dark',
    preferredLanguage: 'en'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  /**
   * Handles form field changes
   * @param {Event} event - Change event
   */
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when typing
    if (error) {
      setError('');
    }
  };

  /**
   * Handles form submission
   * @param {Event} event - Submit event
   */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Validation
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const userData = await register(formData);
      if (onRegisterSuccess) {
        onRegisterSuccess(userData);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'Error creating account. Please try again.');
    }
  };

  /**
   * Validates the form data
   * @returns {string|null} - Error message or null if valid
   */
  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.firstName) {
      return 'Please fill in all required fields';
    }

    if (!isValidEmail(formData.email)) {
      return 'Please enter a valid email';
    }

    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters long';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    return null;
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Toggles password visibility
   */
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  /**
   * Toggles confirmation password visibility
   */
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(prev => !prev);
  };

  // Simple and uniform style
  const inputSx = {
    mb: 2,
    '& .MuiOutlinedInput-root': {
      height: '56px',
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
    }
  };

  return (
    <Fade in timeout={600}>
      <Card
        elevation={0}
        sx={{
          maxWidth: { xs: '100%', sm: 520, md: 600 },
          width: '100%',
          background: `linear-gradient(145deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          borderRadius: { xs: 2, sm: 3 },
          border: `1px solid ${theme.palette.divider}`,
          backdropFilter: 'blur(10px)',
          boxShadow: theme.palette.mode === 'dark' 
            ? `0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)`
            : `0 20px 40px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)`,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          }
        }}
      >
        <CardContent
          sx={{
            p: { xs: 3, sm: 4, md: 5 },
            '&:last-child': { pb: { xs: 3, sm: 4, md: 5 } }
          }}
        >
          {/* Header */}
          <Slide direction="down" in timeout={800}>
            <Box sx={{ textAlign: 'center', mb: { xs: 3, sm: 4 } }}>
              <Box
                sx={{
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '50%',
                    background: `linear-gradient(145deg, ${theme.palette.primary.main}20, ${theme.palette.secondary.main}20)`,
                    border: `2px solid ${theme.palette.primary.main}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PersonAddIcon 
                    sx={{ 
                      fontSize: { xs: 32, sm: 40 },
                      color: theme.palette.primary.main,
                    }} 
                  />
                </Box>
              </Box>
              
              <Typography 
                variant="h4" 
                component="h1" 
                gutterBottom
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                  background: `linear-gradient(45deg, ${theme.palette.text.primary}, ${theme.palette.primary.main})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                Welcome to XandAI
              </Typography>
              
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  opacity: 0.8,
                  maxWidth: 400,
                  mx: 'auto'
                }}
              >
                Create your account and start chatting with AI
              </Typography>
            </Box>
          </Slide>

          {/* Form - Container with fixed width */}
          <Slide direction="up" in timeout={1000}>
            <Box 
              component="form" 
              onSubmit={handleSubmit}
              sx={{
                width: '100%',
                maxWidth: '500px',
                mx: 'auto'
              }}
            >
              {/* Error alert */}
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {/* Form fields */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                
                {/* Personal Information */}
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Personal Information
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    name="firstName"
                    label="First Name"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={isLoading}
                    sx={{ ...inputSx, width: '50%' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: theme.palette.text.secondary }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  
                  <TextField
                    name="lastName"
                    label="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={isLoading}
                    sx={{ ...inputSx, width: '50%' }}
                  />
                </Box>

                {/* Email */}
                <TextField
                  name="email"
                  type="email"
                  label="Email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  sx={inputSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: theme.palette.text.secondary }} />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Passwords */}
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>
                  Security
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    label="Password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    disabled={isLoading}
                    sx={{ ...inputSx, width: '50%' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon sx={{ color: theme.palette.text.secondary }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={togglePasswordVisibility} size="small">
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                  
                  <TextField
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    label="Confirm Password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isLoading}
                    sx={{ ...inputSx, width: '50%' }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={toggleConfirmPasswordVisibility} size="small">
                            {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                {/* Preferences */}
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 1 }}>
                  Preferences
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl sx={{ width: '50%' }}>
                    <InputLabel>Theme</InputLabel>
                    <Select
                      name="theme"
                      value={formData.theme}
                      onChange={handleChange}
                      label="Theme"
                      disabled={isLoading}
                      sx={{ height: '56px' }}
                    >
                      <MenuItem value="light">☀️ Light</MenuItem>
                      <MenuItem value="dark">🌙 Dark</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl sx={{ width: '50%' }}>
                    <InputLabel>Language</InputLabel>
                    <Select
                      name="preferredLanguage"
                      value={formData.preferredLanguage}
                      onChange={handleChange}
                      label="Language"
                      disabled={isLoading}
                      sx={{ height: '56px' }}
                    >
                      <MenuItem value="pt">🇧🇷 Português</MenuItem>
                      <MenuItem value="en">🇺🇸 English</MenuItem>
                      <MenuItem value="es">🇪🇸 Español</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

              </Box>

              {/* Register button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={isLoading}
                endIcon={!isLoading && <ArrowForwardIcon />}
                sx={{
                  mt: 3,
                  mb: 3,
                  py: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  fontWeight: 600,
                  borderRadius: 2,
                  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                  boxShadow: `0 8px 25px ${theme.palette.primary.main}40`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
                    boxShadow: `0 12px 35px ${theme.palette.primary.main}60`,
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'translateY(0px)',
                  },
                  '&.Mui-disabled': {
                    background: theme.palette.action.disabledBackground,
                    color: theme.palette.action.disabled,
                    boxShadow: 'none',
                  }
                }}
              >
                {isLoading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Create Account'
                )}
              </Button>

              <Divider sx={{ my: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  or
                </Typography>
              </Divider>

              {/* Login link */}
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?
                </Typography>
                <Button
                  variant="text"
                  onClick={onSwitchToLogin}
                  disabled={isLoading}
                  sx={{
                    mt: 1,
                    fontWeight: 600,
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    color: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: `${theme.palette.primary.main}10`,
                      transform: 'scale(1.02)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Sign in
                </Button>
              </Box>
            </Box>
          </Slide>
        </CardContent>
      </Card>
    </Fade>
  );
};

export default RegisterForm;