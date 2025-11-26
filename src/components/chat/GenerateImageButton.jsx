import React, { useState } from 'react';
import {
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  Card,
  CardMedia,
  CircularProgress
} from '@mui/material';
import {
  Image as ImageIcon
} from '@mui/icons-material';
import { useStableDiffusion } from '../../application/hooks/useStableDiffusion';

/**
 * Button to generate image based on chat response
 */
const GenerateImageButton = ({ chatResponse, messageId, compact = false, onImageGenerated }) => {
  const { config } = useStableDiffusion();
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Extract prompt from chat response
  const extractPromptFromResponse = (response) => {
    return response
      .replace(/```[\s\S]*?```/g, '') // Remove code
      .replace(/[#*`]/g, '') // Remove markdown
      .replace(/\n+/g, ' ') // Join lines
      .replace(/\s+/g, ' ') // Remove extra spaces
      .trim()
      .substring(0, 150) || 'a beautiful, detailed illustration';
  };

  const saveImageToHistory = async (messageId, imageUrl, filename, originalPrompt) => {
    const response = await fetch(`/api/v1/chat/messages/${messageId}/attachments/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
        filename: filename,
        originalPrompt: originalPrompt,
        metadata: {
          generatedAt: new Date().toISOString(),
          stableDiffusionConfig: {
            model: config.model,
            steps: config.steps,
            width: config.width,
            height: config.height,
            cfgScale: config.cfgScale,
            sampler: config.sampler
          }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error saving image to history: ${response.status}`);
    }

    return await response.json();
  };

  const handleGenerateImage = async () => {
    if (!config?.enabled) {
      setError('Stable Diffusion is not enabled. Configure in settings.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const prompt = extractPromptFromResponse(chatResponse);
      
      const response = await fetch('/api/v1/stable-diffusion/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: prompt,
          negativePrompt: 'low quality, blurry, distorted',
          baseUrl: config.baseUrl,
          model: config.model,
          steps: config.steps,
          width: config.width,
          height: config.height,
          cfgScale: config.cfgScale,
          sampler: config.sampler,
          sdToken: config.token
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const imageUrl = result.imageUrl;
        setGeneratedImage(imageUrl);
        
        // Salva a imagem no histórico se temos messageId
        if (messageId) {
          try {
            const savedMessage = await saveImageToHistory(messageId, result.imageUrl, result.filename, prompt);
            
            // Notify parent component about generated image
            if (onImageGenerated) {
              onImageGenerated(messageId, {
                type: 'image',
                url: result.imageUrl,
                filename: result.filename,
                originalPrompt: prompt,
                metadata: {
                  generatedAt: new Date().toISOString(),
                  stableDiffusionConfig: {
                    model: config.model,
                    steps: config.steps,
                    width: config.width,
                    height: config.height,
                    cfgScale: config.cfgScale,
                    sampler: config.sampler
                  }
                }
              });
            }
          } catch (historyError) {
            console.warn('Error saving image to history:', historyError);
            // Don't fail if can't save to history
          }
        }
      } else {
        setError(result.error || 'Unknown error generating image');
      }
    } catch (err) {
      setError(`Generation error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // If no config or not enabled, don't show button
  if (!config?.enabled) {
    return null;
  }

  // Compact mode - only icon in info line
  if (compact) {
    return (
      <>
        <Button
          variant="text"
          size="small"
          onClick={handleGenerateImage}
          disabled={isLoading}
          sx={{ 
            minWidth: 'auto',
            width: 24,
            height: 20,
            p: 0,
            borderRadius: 1,
            color: isLoading ? 'primary.main' : 'text.secondary',
            '&:hover': {
              bgcolor: 'action.hover',
            },
            '&:disabled': {
              color: 'primary.main',
              animation: isLoading ? 'pulse 2s infinite' : 'none',
            },
            '@keyframes pulse': {
              '0%': {
                opacity: 1,
              },
              '50%': {
                opacity: 0.5,
              },
              '100%': {
                opacity: 1,
              },
            }
          }}
        >
          {isLoading ? (
            <CircularProgress 
              size={14} 
              sx={{ 
                color: 'primary.main',
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                }
              }} 
            />
          ) : (
            <ImageIcon sx={{ fontSize: 16 }} />
          )}
        </Button>

        {/* Don't show image in compact mode - it will appear via history */}

        {/* Progress and error appear as subtle toast */}
        {error && (
          <Box sx={{ 
            position: 'fixed', 
            bottom: 20, 
            right: 20, 
            zIndex: 1000,
            maxWidth: 300 
          }}>
            <Alert 
              severity="error" 
              onClose={() => setError(null)}
              sx={{ 
                fontSize: '0.75rem',
                '& .MuiAlert-message': {
                  py: 0.5
                }
              }}
            >
              {error}
            </Alert>
          </Box>
        )}
      </>
    );
  }

  // Normal mode - complete layout
  return (
    <Box sx={{ mt: 2, width: '100%' }}>
      {/* Generated image - centered */}
      {generatedImage && (
        <Box sx={{ mt: 2, mb: 2, display: 'flex', justifyContent: 'center' }}>
          <Card 
            sx={{ 
              maxWidth: 400, 
              borderRadius: 3,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }}
          >
            <CardMedia
              component="img"
              image={generatedImage}
              alt="Imagem gerada pelo Stable Diffusion"
              sx={{ 
                width: '100%',
                height: 'auto',
                maxHeight: 400,
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </Card>
        </Box>
      )}

      {/* Generate image button - centered */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<ImageIcon />}
          onClick={handleGenerateImage}
          disabled={isLoading}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            px: 2,
            py: 0.75,
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '&:disabled': {
              bgcolor: 'grey.300',
            }
          }}
        >
          {isLoading ? 'Generating...' : 'Generate Image'}
        </Button>
      </Box>

      {/* Progress bar - centered */}
      {isLoading && (
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <LinearProgress 
            sx={{ 
              borderRadius: 1, 
              height: 6,
              width: '100%',
              maxWidth: 300,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 1,
              }
            }} 
          />
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              mt: 1, 
              fontStyle: 'italic',
              textAlign: 'center'
            }}
          >
            Gerando imagem com Stable Diffusion...
          </Typography>
        </Box>
      )}

      {/* Error - centered */}
      {error && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Alert 
            severity="error" 
            sx={{ 
              maxWidth: 400,
              borderRadius: 2
            }}
          >
            {error}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default GenerateImageButton;