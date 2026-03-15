export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  equals(vo?: ValueObject<T>): boolean {
    if (!vo) return false;
    if (!(vo instanceof ValueObject)) return false;
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}
