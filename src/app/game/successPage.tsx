'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from '../../styles/Game.module.css';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const signature = searchParams.get('signature');
  const score = searchParams.get('score');

  return (
    <div className={styles.body}>
      <main className={styles.successScreen}>
        <h1>Thành công!</h1>
        <p>Bạn đã ký giao dịch để bắt đầu trò chơi.</p>
        {signature && (
          <p>
            Chữ ký: <code>{signature.slice(0, 10)}...{signature.slice(-10)}</code>
          </p>
        )}
        {score && <p>Điểm số hiện tại: {score}</p>}
        <Link href="/game" className={styles.backButton}>
          Quay lại trò chơi
        </Link>
      </main>
    </div>
  );
}