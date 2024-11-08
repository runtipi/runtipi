import { UserDto } from '@/modules/user/user.repository';

declare global {
  namespace Express {
    interface Request {
      user?: UserDto;
    }
  }
}
