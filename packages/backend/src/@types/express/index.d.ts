import type { UserDto } from '@/modules/user/dto/user.dto';

declare global {
  namespace Express {
    interface Request {
      user?: UserDto;
    }
  }
}
