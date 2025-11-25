import { useState, useEffect } from 'react';

interface KeyboardState {
  isOpen: boolean;
  keyboardHeight: number;
  viewportHeight: number;
}

export function useKeyboardDetection() {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isOpen: false,
    keyboardHeight: 0,
    viewportHeight: window.innerHeight,
  });

  useEffect(() => {
    const initialHeight = window.innerHeight;
    let isKeyboardOpen = false;

    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialHeight - currentHeight;
      
      // Considera que o teclado está aberto se a diferença for maior que 150px
      const keyboardIsOpen = heightDifference > 150;
      
      if (keyboardIsOpen !== isKeyboardOpen) {
        isKeyboardOpen = keyboardIsOpen;
        
        setKeyboardState({
          isOpen: keyboardIsOpen,
          keyboardHeight: keyboardIsOpen ? heightDifference : 0,
          viewportHeight: currentHeight,
        });

        // Adiciona classe ao body para debug visual
        if (keyboardIsOpen) {
          document.body.classList.add('keyboard-open');
          document.body.style.setProperty('--keyboard-height', `${heightDifference}px`);
        } else {
          document.body.classList.remove('keyboard-open');
          document.body.style.removeProperty('--keyboard-height');
        }
      }
    };

    // Usa visualViewport para melhor detecção em mobile
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      } else {
        window.removeEventListener('resize', handleResize);
      }
      document.body.classList.remove('keyboard-open');
      document.body.style.removeProperty('--keyboard-height');
    };
  }, []);

  return keyboardState;
}
