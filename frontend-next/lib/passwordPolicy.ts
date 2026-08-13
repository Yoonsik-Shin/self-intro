export const BLOCKED_PASSWORDS = new Set([
    'password1!',
    'password123!',
    'qwerty123!',
    'qwertyuiop1!',
    'letmein123!',
    'welcome123!',
    'admin1234!',
    'administrator1!',
    'iloveyou1!',
    'changeme1!',
    'abc123456!',
    '123456789a!',
    '1q2w3e4r!',
    '1qaz2wsx!',
    'asdfghjkl1!',
    'zxcvbnm123!',
    'passw0rd1!',
    'p@ssword1',
    'p@ssw0rd1',
]);

export const PASSWORD_RULES = [
    { label: '10~32자', test: (value: string) => value.length >= 10 && value.length <= 32 },
    { label: '영문 대문자 1자 이상', test: (value: string) => /[A-Z]/.test(value) },
    { label: '영문 소문자 1자 이상', test: (value: string) => /[a-z]/.test(value) },
    { label: '숫자 1자 이상', test: (value: string) => /[0-9]/.test(value) },
    { label: '특수문자 1자 이상', test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
    { label: '공백 없음', test: (value: string) => !/\s/.test(value) },
    {
        label: 'UTF-8 기준 72바이트 이하',
        test: (value: string) => new TextEncoder().encode(value).length <= 72,
    },
    {
        label: '널리 쓰이는 취약 비밀번호가 아님',
        test: (value: string) => !BLOCKED_PASSWORDS.has(value.toLowerCase()),
    },
] as const;
