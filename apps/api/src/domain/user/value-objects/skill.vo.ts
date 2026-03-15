import { ValueObject } from '../../common/value-object.base';
import { Result } from '../../common/result';

export type SkillType = 'bartender' | 'line_cook' | 'server' | 'host';

interface SkillProps {
  value: SkillType;
}

export class Skill extends ValueObject<SkillProps> {
  static readonly BARTENDER = 'bartender' as const;
  static readonly LINE_COOK = 'line_cook' as const;
  static readonly SERVER = 'server' as const;
  static readonly HOST = 'host' as const;

  private static readonly VALID_SKILLS: SkillType[] = [
    'bartender',
    'line_cook',
    'server',
    'host',
  ];

  private constructor(props: SkillProps) {
    super(props);
  }

  get value(): SkillType {
    return this.props.value;
  }

  static getValidSkills(): SkillType[] {
    return [...Skill.VALID_SKILLS];
  }

  static create(skill: string): Result<Skill, string> {
    const normalized = skill?.toLowerCase() as SkillType;

    if (!Skill.VALID_SKILLS.includes(normalized)) {
      return Result.fail<Skill, string>(
        `Invalid skill: ${skill}. Must be one of: ${Skill.VALID_SKILLS.join(', ')}`,
      );
    }

    return Result.ok<Skill, string>(new Skill({ value: normalized }));
  }
}
