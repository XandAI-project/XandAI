import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ChatMessage from './ChatMessage';

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('ChatMessage - Performance Metrics Display', () => {
  const mockUserMessage = {
    id: '1',
    content: 'Hello, how are you?',
    sender: 'user',
    isUser: true,
    timestamp: new Date('2024-01-01T10:00:00'),
    getFormattedTime: () => '10:00',
    isFromUser: () => true,
  };

  const mockAssistantMessage = {
    id: '2',
    content: 'I am doing great, thank you!',
    sender: 'assistant',
    isUser: false,
    timestamp: new Date('2024-01-01T10:00:05'),
    getFormattedTime: () => '10:00',
    isFromUser: () => false,
    metadata: {
      model: 'llama3.2',
      tokens: 150,
      processingTime: 3000,
      tokensPerSecond: 50,
    },
  };

  describe('Metrics Visibility', () => {
    it('should not display metrics for user messages', () => {
      renderWithTheme(<ChatMessage message={mockUserMessage} />);
      
      // User message should not have performance chips
      expect(screen.queryByText(/t\/s/)).not.toBeInTheDocument();
      expect(screen.queryByText(/s$/)).not.toBeInTheDocument();
    });

    it('should display tokens/s metric for assistant messages with metadata', () => {
      renderWithTheme(<ChatMessage message={mockAssistantMessage} />);
      
      // Should display tokens per second
      expect(screen.getByText('50.0 t/s')).toBeInTheDocument();
    });

    it('should display processing time for assistant messages with metadata', () => {
      renderWithTheme(<ChatMessage message={mockAssistantMessage} />);
      
      // Should display processing time in seconds (3000ms = 3.00s)
      expect(screen.getByText('3.00s')).toBeInTheDocument();
    });

    it('should not display metrics for streaming messages', () => {
      const streamingMessage = {
        ...mockAssistantMessage,
        isStreaming: true,
      };
      
      renderWithTheme(<ChatMessage message={streamingMessage} />);
      
      // Streaming messages should not show metrics yet
      expect(screen.queryByText(/t\/s/)).not.toBeInTheDocument();
    });

    it('should not display metrics when metadata is missing', () => {
      const messageWithoutMetadata = {
        ...mockAssistantMessage,
        metadata: undefined,
      };
      
      renderWithTheme(<ChatMessage message={messageWithoutMetadata} />);
      
      expect(screen.queryByText(/t\/s/)).not.toBeInTheDocument();
      expect(screen.queryByText(/s$/)).not.toBeInTheDocument();
    });
  });

  describe('Metrics Formatting', () => {
    it('should format tokens/s with 1 decimal place', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          ...mockAssistantMessage.metadata,
          tokensPerSecond: 45.678,
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.getByText('45.7 t/s')).toBeInTheDocument();
    });

    it('should format processing time with 2 decimal places', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          ...mockAssistantMessage.metadata,
          processingTime: 1234, // 1.234 seconds
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.getByText('1.23s')).toBeInTheDocument();
    });

    it('should handle zero values gracefully', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          ...mockAssistantMessage.metadata,
          tokensPerSecond: 0,
          processingTime: 0,
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      // Should not display metrics if they are zero
      expect(screen.queryByText('0.0 t/s')).not.toBeInTheDocument();
      expect(screen.queryByText('0.00s')).not.toBeInTheDocument();
    });
  });

  describe('Metrics Values', () => {
    it('should display high tokens/s correctly', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          ...mockAssistantMessage.metadata,
          tokensPerSecond: 125.5,
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.getByText('125.5 t/s')).toBeInTheDocument();
    });

    it('should display low tokens/s correctly', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          ...mockAssistantMessage.metadata,
          tokensPerSecond: 8.2,
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.getByText('8.2 t/s')).toBeInTheDocument();
    });

    it('should display very fast processing time', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          ...mockAssistantMessage.metadata,
          processingTime: 250, // 0.25 seconds
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.getByText('0.25s')).toBeInTheDocument();
    });

    it('should display long processing time', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          ...mockAssistantMessage.metadata,
          processingTime: 45000, // 45 seconds
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.getByText('45.00s')).toBeInTheDocument();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should display metrics for typical chat response', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          model: 'llama3.2',
          tokens: 150,
          processingTime: 3000,
          tokensPerSecond: 50,
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.getByText('50.0 t/s')).toBeInTheDocument();
      expect(screen.getByText('3.00s')).toBeInTheDocument();
    });

    it('should display metrics for fast response', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          model: 'llama3.2',
          tokens: 50,
          processingTime: 250,
          tokensPerSecond: 200,
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.getByText('200.0 t/s')).toBeInTheDocument();
      expect(screen.getByText('0.25s')).toBeInTheDocument();
    });

    it('should display metrics for slow response', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          model: 'llama3.2',
          tokens: 150,
          processingTime: 10000,
          tokensPerSecond: 15,
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.getByText('15.0 t/s')).toBeInTheDocument();
      expect(screen.getByText('10.00s')).toBeInTheDocument();
    });

    it('should display metrics for long-form generation', () => {
      const message = {
        ...mockAssistantMessage,
        content: 'A very long detailed response...',
        metadata: {
          model: 'llama3.2',
          tokens: 800,
          processingTime: 15000,
          tokensPerSecond: 53.33,
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.getByText('53.3 t/s')).toBeInTheDocument();
      expect(screen.getByText('15.00s')).toBeInTheDocument();
    });
  });

  describe('Conditional Rendering', () => {
    it('should only show tokensPerSecond when available and > 0', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          ...mockAssistantMessage.metadata,
          tokensPerSecond: undefined,
          processingTime: 3000,
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.queryByText(/t\/s/)).not.toBeInTheDocument();
      expect(screen.getByText('3.00s')).toBeInTheDocument();
    });

    it('should only show processingTime when available and > 0', () => {
      const message = {
        ...mockAssistantMessage,
        metadata: {
          ...mockAssistantMessage.metadata,
          tokensPerSecond: 50,
          processingTime: undefined,
        },
      };
      
      renderWithTheme(<ChatMessage message={message} />);
      
      expect(screen.getByText('50.0 t/s')).toBeInTheDocument();
      expect(screen.queryByText(/\ds$/)).not.toBeInTheDocument();
    });
  });
});
