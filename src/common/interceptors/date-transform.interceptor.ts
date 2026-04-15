import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Date 객체를 "YYYY-MM-DD HH:mm:ss.SS" 형식으로 변환
// 소수점 2자리 = 10밀리초 단위 (centiseconds)
function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getUTCFullYear();
  const mo = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  // 밀리초(3자리) → 소수점 2자리로 변환: 819ms → .81
  const cs = pad(Math.floor(date.getUTCMilliseconds() / 10));
  return `${y}-${mo}-${d} ${h}:${mi}:${s}.${cs}`;
}

// 응답 객체 내 모든 Date 인스턴스를 재귀적으로 변환
function transformDates(value: unknown): unknown {
  if (value instanceof Date) {
    return formatDate(value);
  }
  if (Array.isArray(value)) {
    return value.map(transformDates);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        transformDates(v),
      ]),
    );
  }
  return value;
}

@Injectable()
export class DateTransformInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data: unknown) => transformDates(data)));
  }
}
