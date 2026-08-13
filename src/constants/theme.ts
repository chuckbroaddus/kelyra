export const colors = {
  bg: '#0f1419',
  header: '#15202b',
  surface: '#1a2332',
  text: '#e7ecf3',
  muted: '#8b9bb4',
  border: '#2f3d52',
  accent: '#7aa2ff',
  button: '#3b6fd9',
  buttonText: '#ffffff',
  danger: '#f07178',
  dangerBg: '#6b2428',
  preview: '#243044',
  chipOn: '#2a4a86',
};

export const theme = {
  colors,
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    gap: 12,
  },
  scroll: {
    padding: 24,
    paddingBottom: 48,
    gap: 12,
    backgroundColor: colors.bg,
    flexGrow: 1,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700' as const,
  },
  body: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.button,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  buttonText: {
    color: colors.buttonText,
    fontWeight: '600' as const,
  },
  secondary: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  secondaryText: {
    color: colors.accent,
    fontWeight: '600' as const,
  },
  error: {
    color: colors.danger,
  },
  linkText: {
    color: colors.accent,
    fontWeight: '600' as const,
  },
  preview: {
    width: '100%' as const,
    height: 220,
    borderRadius: 8,
    backgroundColor: colors.preview,
  },
};
