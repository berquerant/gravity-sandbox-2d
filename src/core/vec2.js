/**
 * 2D Vector class with chainable arithmetic helpers
 */
export class Vec2 {
  /**
   * @param {number} [x=0] - X coordinate
   * @param {number} [y=0] - Y coordinate
   */
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  /**
   * Sets the coordinates of this vector.
   * @param {number} x
   * @param {number} y
   * @returns {Vec2} this
   */
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  /**
   * Adds another vector to this vector in place.
   * @param {Vec2} v
   * @returns {Vec2} this
   */
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /**
   * Subtracts another vector from this vector in place.
   * @param {Vec2} v
   * @returns {Vec2} this
   */
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /**
   * Multiplies this vector by a scalar in place.
   * @param {number} n
   * @returns {Vec2} this
   */
  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  /**
   * Divides this vector by a non-zero scalar in place.
   * @param {number} n
   * @returns {Vec2} this
   */
  div(n) {
    if (n !== 0) {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }

  /**
   * Computes the squared magnitude (length squared) of this vector.
   * @returns {number}
   */
  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  /**
   * Computes the magnitude (Euclidean length) of this vector.
   * @returns {number}
   */
  mag() {
    return Math.sqrt(this.magSq());
  }

  /**
   * Creates a duplicate copy of this vector.
   * @returns {Vec2}
   */
  copy() {
    return new Vec2(this.x, this.y);
  }

  /**
   * Computes the squared Euclidean distance to another vector.
   * @param {Vec2} v
   * @returns {number}
   */
  distSq(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  /**
   * Computes the Euclidean distance to another vector.
   * @param {Vec2} v
   * @returns {number}
   */
  dist(v) {
    return Math.sqrt(this.distSq(v));
  }
}
