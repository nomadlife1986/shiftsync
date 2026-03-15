import { ValueObject } from '../../common/value-object.base';
import { Result } from '../../common/result';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private static readonly EMAIL_REGEX =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(email: string): Result<Email, string> {
    if (!email || email.trim().length === 0) {
      return Result.fail<Email, string>('Email cannot be empty');
    }

    const normalized = email.trim().toLowerCase();

    if (!Email.EMAIL_REGEX.test(normalized)) {
      return Result.fail<Email, string>(`Invalid email format: ${normalized}`);
    }

    if (normalized.length > 254) {
      return Result.fail<Email, string>('Email exceeds maximum length of 254 characters');
    }

    return Result.ok<Email, string>(new Email({ value: normalized }));
  }
}
