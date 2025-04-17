'use client';

import { useAccount } from 'wagmi';
import { useEffect } from 'react';

export default function ConnectButton({ className }: { className?: string }) {
  const { address, isConnected } = useAccount();

  useEffect(() => {
    if (isConnected && address) {
      // Cập nhật giao diện khi kết nối ví
      document.getElementById('connectweb3-screen')!.style.display = 'none';
      document.getElementById('initial-screen')!.style.display = 'flex';
      document.getElementById('wallet-greeting')!.textContent = `Hello ${address.slice(0, 2)}.${address.slice(-5)}!`;
    }
  }, [isConnected, address]);

  return <appkit-button className={className} />;
}