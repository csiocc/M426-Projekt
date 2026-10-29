import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Aura, angepasst an den Apple-Stil der App: Systemblau statt Gruen, neutrale
 * Grautoene statt des leicht blaeulichen Slate, Pillen-Buttons und weichere
 * Eingabefelder. Die Farben passen zu den Variablen in styles.css.
 */
export const AppTheme = definePreset(Aura, {
  primitive: {
    borderRadius: { none: '0', xs: '4px', sm: '6px', md: '10px', lg: '14px', xl: '20px' },
  },
  semantic: {
    primary: {
      50: '#e6f1fc',
      100: '#cce3fa',
      200: '#99c7f4',
      300: '#5eb0ff',
      400: '#2997ff',
      500: '#0071e3',
      600: '#0062c4',
      700: '#0051a2',
      800: '#004080',
      900: '#002f5e',
      950: '#001f3f',
      // Weisse Schrift auf Blau auch im Dark Mode, wie bei Apple.
      contrastColor: '#ffffff',
    },
    surface: {
      0: '#ffffff',
      50: '{neutral.50}',
      100: '{neutral.100}',
      200: '{neutral.200}',
      300: '{neutral.300}',
      400: '{neutral.400}',
      500: '{neutral.500}',
      600: '{neutral.600}',
      700: '{neutral.700}',
      800: '{neutral.800}',
      900: '{neutral.900}',
      950: '{neutral.950}',
    },
    content: {
      background: 'var(--app-card)',
      borderColor: 'var(--app-separator)',
    },
    formField: {
      paddingX: '0.75rem',
      paddingY: '0.5rem',
      background: 'light-dark(#ffffff, #2c2c2e)',
      borderColor: 'light-dark(#d2d2d7, #3a3a3c)',
      hoverBorderColor: 'light-dark(#aeaeb2, #545458)',
      focusBorderColor: '{primary.color}',
      invalidBorderColor: 'var(--app-danger)',
      sm: { fontSize: '0.875rem', paddingX: '0.625rem', paddingY: '0.375rem' },
    },
  },
  components: {
    button: {
      root: { borderRadius: '980px', paddingX: '1rem', sm: { paddingX: '0.875rem' } },
    },
  },
});
