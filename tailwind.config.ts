import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "xs": "475px",
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        'hero-gradient': 'var(--hero-gradient)',
        'feature-gradient': 'var(--feature-gradient)',
        'premium-gradient': 'var(--premium-gradient)',
        'glass-gradient': 'var(--glass-gradient)',
        'card-gradient': 'var(--card-gradient)',
        'auth-gradient': 'var(--auth-gradient)',
        'pro-gradient': 'var(--pro-gradient)',
        'pro-glass': 'var(--pro-glass)',
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'medium': 'var(--shadow-medium)',
        'strong': 'var(--shadow-strong)',
        'premium-glow': 'var(--shadow-premium-glow)',
        'glass': 'var(--shadow-glass)',
        'float': 'var(--shadow-float)',
        'glow': 'var(--shadow-glow)',
        'neumorphic': 'var(--shadow-neumorphic)',
        'pro-glow': 'var(--shadow-pro-glow)',
        'pro-strong': 'var(--shadow-pro-strong)',
        'card-hover': 'var(--shadow-card-hover)',
        'pro-hover': 'var(--shadow-pro-hover)',
        'button-hover': 'var(--shadow-button-hover)',
        'bounce': '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      backdropBlur: {
        'glass': '16px',
      },
      transitionTimingFunction: {
        'smooth': 'var(--transition-smooth)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        card: "var(--radius-card)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "pulse-slow": {
          "0%, 100%": {
            opacity: "1",
          },
          "50%": {
            opacity: "0.85",
          }
        },
        "heartbeat": {
          "0%, 100%": {
            transform: "scale(1)",
          },
          "14%": {
            transform: "scale(1.05)",
          },
          "28%": {
            transform: "scale(1)",
          },
          "42%": {
            transform: "scale(1.05)",
          },
          "56%": {
            transform: "scale(1)",
          }
        },
        "shimmer": {
          "0%": {
            transform: "translateX(-100%)",
          },
          "100%": {
            transform: "translateX(100%)",
          }
        },
        "bounce-subtle": {
          "0%, 100%": {
            transform: "scale(1)",
          },
          "50%": {
            transform: "scale(0.95)",
          }
        },
        "glow-pulse": {
          "0%, 100%": {
            opacity: "0.5",
            boxShadow: "0 0 20px currentColor",
          },
          "50%": {
            opacity: "1",
            boxShadow: "0 0 40px currentColor",
          }
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "pulse-slow": "pulse-slow 10s ease-in-out infinite",
        "heartbeat": "heartbeat 10s ease-in-out infinite",
        "shimmer": "shimmer 2s infinite",
        "bounce-subtle": "bounce-subtle 0.5s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
