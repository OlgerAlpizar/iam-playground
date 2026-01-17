import { escapeRegex } from './escape-regex.util';

describe('escapeRegex', () => {
  it('should escape dots', () => {
    expect(escapeRegex('test.com')).toBe('test\\.com');
  });

  it('should escape asterisks', () => {
    expect(escapeRegex('test*')).toBe('test\\*');
  });

  it('should escape question marks', () => {
    expect(escapeRegex('test?')).toBe('test\\?');
  });

  it('should escape plus signs', () => {
    expect(escapeRegex('test+')).toBe('test\\+');
  });

  it('should escape caret', () => {
    expect(escapeRegex('^test')).toBe('\\^test');
  });

  it('should escape dollar sign', () => {
    expect(escapeRegex('test$')).toBe('test\\$');
  });

  it('should escape curly braces', () => {
    expect(escapeRegex('test{1,3}')).toBe('test\\{1,3\\}');
  });

  it('should escape parentheses', () => {
    expect(escapeRegex('(test)')).toBe('\\(test\\)');
  });

  it('should escape pipe', () => {
    expect(escapeRegex('a|b')).toBe('a\\|b');
  });

  it('should escape square brackets', () => {
    expect(escapeRegex('[abc]')).toBe('\\[abc\\]');
  });

  it('should escape backslashes', () => {
    expect(escapeRegex('test\\path')).toBe('test\\\\path');
  });

  it('should escape multiple special characters', () => {
    expect(escapeRegex('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('should return string unchanged if no special characters', () => {
    expect(escapeRegex('hello world')).toBe('hello world');
  });

  it('should handle empty string', () => {
    expect(escapeRegex('')).toBe('');
  });

  it('should work correctly with RegExp constructor', () => {
    const userInput = '.*admin';
    const escaped = escapeRegex(userInput);
    const regex = new RegExp(escaped);

    expect(regex.test('.*admin')).toBe(true);
    expect(regex.test('xyzadmin')).toBe(false);
  });
});
