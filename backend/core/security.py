"""Password hashing utilities.

Uses passlib/bcrypt when available and the environment is compatible.
Falls back to the raw bcrypt package to handle Python 3.13 / passlib
compatibility issues (passlib 1.7.x does not fully support bcrypt 4.x).
"""
import warnings

_USE_PASSLIB = False

try:
    import bcrypt as _bcrypt_raw

    # Test that raw bcrypt actually works on this interpreter
    _test = _bcrypt_raw.hashpw(b"probe", _bcrypt_raw.gensalt())
    assert _bcrypt_raw.checkpw(b"probe", _test)

    def hash_password(plain_password: str) -> str:
        """Hash a plain-text password using bcrypt."""
        return _bcrypt_raw.hashpw(
            plain_password.encode("utf-8"), _bcrypt_raw.gensalt(rounds=12)
        ).decode("utf-8")

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plain-text password against a bcrypt hash."""
        try:
            return _bcrypt_raw.checkpw(
                plain_password.encode("utf-8"), hashed_password.encode("utf-8")
            )
        except Exception:
            return False

except Exception:
    # Final fallback — passlib
    from passlib.context import CryptContext
    _pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def hash_password(plain_password: str) -> str:  # type: ignore[misc]
        return _pwd_context.hash(plain_password)

    def verify_password(plain_password: str, hashed_password: str) -> bool:  # type: ignore[misc]
        return _pwd_context.verify(plain_password, hashed_password)
