export const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9\s])(?=\S+$).{8,}$/;

export const PASSWORD_MESSAGE =
  'Password must be at least 8 characters, contain no spaces, and include at least one uppercase letter, one number, and one special character';
