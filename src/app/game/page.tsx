// app/game/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import * as THREE from 'three';
import styles from '../../styles/Game.module.css';
import ConnectButton from '@/components/ConnectButton';
import { ws, sendScoreToServer, isValidLeaderboardEntry } from '../../lib/server';
import { Block, startGame, resetGameData, cutBlock, spawnNewBlock, stopAnimation } from '../../lib/gameLogic';
import Head from 'next/head';
import { useAppKit } from '@reown/appkit/react';
import { contractAddress, contractABI } from '../../lib/web3Integrate';

interface LeaderboardEntry {
  address: string;
  score: number;
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leaderboardRef = useRef<HTMLDivElement>(null);
  const { open } = useAppKit();

  // Hàm lưu và tải leaderboard từ localStorage
  const saveLeaderboardToCache = (data: LeaderboardEntry[]) => {
    try {
      localStorage.setItem('leaderboard', JSON.stringify(data));
    } catch (err) {
      console.error('Error saving leaderboard to cache:', err);
    }
  };

  const loadLeaderboardFromCache = (): LeaderboardEntry[] => {
    try {
      const data = localStorage.getItem('leaderboard');
      return data ? JSON.parse(data) : [];
    } catch (err) {
      console.error('Error loading leaderboard from cache:', err);
      return [];
    }
  };

  // Khai báo trạng thái
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [clickCooldown, setClickCooldown] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(loadLeaderboardFromCache());
  const [isLeaderboardVisible, setIsLeaderboardVisible] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [error, setError] = useState<string | null>(null);

  // Wagmi hooks để tương tác với hợp đồng
  const { data: hash, writeContract, isPending: isTxPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Đọc PLAY_FEE từ hợp đồng
  const { data: playFee } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'PLAY_FEE',
  });

  // Đọc block.timestamp từ blockchain để đồng bộ (giữ lại nhưng không dùng cho startGame)
  const { data: blockTimestamp } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getPlayerData',
    args: [address],
    select: (data) => data[1], // Lấy lastPlayed làm ước lượng timestamp
  });

  useEffect(() => {
    // Thiết lập scene, camera, renderer
    if (!canvasRef.current) {
      console.error('Canvas ref does not exist');
      setError('Cannot initialize canvas');
      return;
    }
    window.scene = new THREE.Scene();
    window.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    window.renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvasRef.current });
    window.renderer.setSize(window.innerWidth, window.innerHeight);
    window.renderer.setClearColor(0x000000, 1);

    const updateCamera = () => {
      const aspect = window.innerWidth / window.innerHeight;
      const offsetX = window.innerWidth < 768 ? -1 : -2;
      camera.aspect = aspect;
      camera.position.set(20, 15, 15);
      camera.lookAt(0, 0, 0);
      camera.rotation.x = -Math.PI / 2.5;
      camera.rotation.z = Math.PI / 1.1;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    updateCamera();

    const handleResize = () => {
      updateCamera();
      window.renderer.render(window.scene, window.camera);
    };
    window.addEventListener('resize', handleResize);

    // Kiểm tra WebGL
    if (!window.renderer.getContext()) {
      console.error('WebGL is not supported');
      setError('Your browser does not support WebGL');
      return;
    }

    // Khởi tạo biến toàn cục
    window.bounds = 12.5;
    window.stack = [];
    window.fallingBlocks = [];
    window.currentBlock = null;
    window.previousBlock = null;
    window.score = 0;
    window.gameOver = false;
    window.gameStarted = false;
    window.clickCooldown = false;
    window.animationId = null;

    // Cập nhật wallet address từ Wagmi
    if (isConnected && address) {
      setWalletAddress(address.toLowerCase());
      document.getElementById('connectweb3-screen')!.style.display = 'none';
      document.getElementById('initial-screen')!.style.display = 'flex';
      document.getElementById('wallet-greeting')!.textContent = `Welcome ${address.slice(0, 2)}...${address.slice(-4)}!`;
    } else {
      setWalletAddress('');
      document.getElementById('connectweb3-screen')!.style.display = 'flex';
      document.getElementById('initial-screen')!.style.display = 'none';
      document.getElementById('game-screen')!.style.display = 'none';
    }

    // Xử lý WebSocket cho leaderboard
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received WebSocket message:', JSON.stringify(message, null, 2));
        if (message.type === 'leaderboard') {
          const rawData = message.data;
          console.log('Raw leaderboard data:', JSON.stringify(rawData, null, 2));
          const newData = rawData
            .map((entry: any) => ({
              score: Number(entry.score),
              address: entry.address.toLowerCase(),
            }))
            .filter(isValidLeaderboardEntry)
            .reduce((acc: LeaderboardEntry[], entry: LeaderboardEntry) => {
              const existing = acc.find((e) => e.address === entry.address);
              if (existing) {
                existing.score = Math.max(existing.score, entry.score);
              } else {
                acc.push(entry);
              }
              return acc;
            }, []);
          console.log('Filtered and reduced leaderboard data:', JSON.stringify(newData, null, 2));
          setLeaderboardData([...newData]);
          saveLeaderboardToCache(newData);
          console.log('leaderboardData updated:', JSON.stringify(newData, null, 2));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      window.removeEventListener('resize', handleResize);
      stopAnimation();
      window.renderer.dispose();
    };
  }, [isConnected, address]);

  // Xử lý click để cắt block
  useEffect(() => {
    const handleClick = () => {
      console.log('Click detected:', {
        gameOver: window.gameOver,
        gameStarted: window.gameStarted,
        clickCooldown: window.clickCooldown,
        currentBlock: !!window.currentBlock,
        previousBlock: !!window.previousBlock,
        walletAddress,
      });
      if (window.gameOver || !window.gameStarted || window.clickCooldown || !window.currentBlock || !window.previousBlock) {
        console.log('Click ignored:', {
          gameOver: window.gameOver,
          gameStarted: window.gameStarted,
          clickCooldown: window.clickCooldown,
          currentBlock: window.currentBlock,
          previousBlock: window.previousBlock,
        });
        return;
      }
      window.clickCooldown = true;
      const newBlock = cutBlock(window.currentBlock, window.previousBlock);
      if (newBlock) {
        setScore((prev) => {
          const newScore = prev + 1;
          window.score = newScore;
          console.log('Score updated:', newScore);
          return newScore;
        });
        window.previousBlock = newBlock;
        spawnNewBlock();
      } else {
        window.gameOver = true;
        setGameOver(true);
        console.log('Game over, preparing to send score:', { score: window.score, walletAddress });
        if (walletAddress && window.score > 0) {
          // Gửi điểm lên server để lấy chữ ký và gửi lên blockchain
          const messageElement = document.getElementById('initial-message')!;
          sendScoreToServer(window.score, walletAddress, messageElement);
        } else {
          console.warn('Score not sent:', { walletAddress, score: window.score });
        }
      }
      setTimeout(() => {
        window.clickCooldown = false;
        console.log('Click cooldown reset');
      }, 200);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [walletAddress]);

  // Xử lý bấm ngoài bảng Leaderboard để đóng
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isLeaderboardVisible &&
        leaderboardRef.current &&
        !leaderboardRef.current.contains(event.target as Node)
      ) {
        setIsLeaderboardVisible(false);
        console.log('Closed leaderboard due to outside click');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLeaderboardVisible]);

  const handlePlayNow = async () => {
    if (!walletAddress) {
      console.log('Wallet not connected');
      document.getElementById('initial-message')!.textContent = 'Please connect your wallet first!';
      return;
    }

    if (!playFee) {
      console.log('Unable to fetch PLAY_FEE');
      document.getElementById('initial-message')!.textContent = 'Unable to fetch play fee!';
      return;
    }

    console.log('Starting blockchain transaction to play game with wallet:', walletAddress);
    const loadingBar = document.getElementById('loading-bar')!;
    loadingBar.style.display = 'block';
    loadingBar.classList.add('active');
    document.getElementById('initial-message')!.textContent = 'Please confirm the transaction...';

    try {
      // Gửi giao dịch blockchain để bắt đầu game
      writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'startGame',
        value: BigInt(playFee),
      });
    } catch (err) {
      console.error('Error during transaction:', err);
      setError('Failed to start game! Transaction error.');
      document.getElementById('initial-message')!.textContent = 'Failed to start game! Please try again.';
      loadingBar.style.display = 'none';
      loadingBar.classList.remove('active');
    }
  };

  // Xử lý xác nhận giao dịch
  useEffect(() => {
    const loadingBar = document.getElementById('loading-bar')!;
    if (txError) {
      console.error('Transaction error:', txError);
      setError(txError.message);
      document.getElementById('initial-message')!.textContent = txError.message;
      loadingBar.style.display = 'none';
      loadingBar.classList.remove('active');
      return;
    }

    if (isConfirmed) {
      console.log('Transaction confirmed:', hash);
      document.getElementById('initial-message')!.textContent = 'Transaction successful! Starting game...';
      // Chuyển sang màn hình game
      document.getElementById('initial-screen')!.style.display = 'none';
      document.getElementById('game-screen')!.style.display = 'flex';
      resetGameData();
      setScore(0);
      setGameOver(false);
      setGameStarted(true);
      startGame();
      window.clickCooldown = true;
      setTimeout(() => {
        window.clickCooldown = false;
        loadingBar.style.display = 'none';
        loadingBar.classList.remove('active');
        document.getElementById('initial-message')!.textContent = '';
        console.log('Game started, loading bar hidden');
      }, 200);
    }
  }, [isConfirmed, txError, hash]);

  const handleDisconnect = () => {
    disconnect();
    setWalletAddress('');
    resetGameData();
    document.getElementById('connectweb3-screen')!.style.display = 'flex';
    document.getElementById('initial-screen')!.style.display = 'none';
    document.getElementById('game-screen')!.style.display = 'none';
    console.log('Wallet disconnected');
  };

  const resetToInitialScreen = () => {
    stopAnimation();
    resetGameData();
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    document.getElementById('game-screen')!.style.display = 'none';
    document.getElementById('initial-screen')!.style.display = 'flex';
    // Xóa scene và làm mới canvas
    if (window.scene) {
      while (window.scene.children.length > 0) {
        window.scene.remove(window.scene.children[0]);
      }
      window.renderer.render(window.scene, window.camera);
    }
    console.log('Returned to initial screen, scene cleared');
  };

  const renderLeaderboard = (data: LeaderboardEntry[]) => {
    console.log('Rendering leaderboard with data:', JSON.stringify(data, null, 2));
    const currentPlayer = data.find(
      (entry) => entry.address.toLowerCase() === walletAddress.toLowerCase()
    );
    const otherPlayers = data
      .filter((entry) => entry.address.toLowerCase() !== walletAddress.toLowerCase())
      .sort((a, b) => b.score - a.score);
    const displayData = currentPlayer ? [currentPlayer, ...otherPlayers] : otherPlayers;

    return (
      <div
        className={`${styles.leaderboardDisplay} ${isLeaderboardVisible ? styles.active : ''}`}
        ref={leaderboardRef}
      >
        <button
          className={styles.closeLeaderboardButton}
          onClick={() => {
            setIsLeaderboardVisible(false);
            console.log('Set leaderboard visibility to false');
          }}
        >
          Close
        </button>
        <table className={styles.leaderboardTable}>
          <thead>
            <tr>
              <th>Rank</th>
              <th>WalletID</th>
              <th>Point</th>
            </tr>
          </thead>
          <tbody>
            {displayData.length === 0 ? (
              <tr>
                <td colSpan={3}>No data</td>
              </tr>
            ) : (
              displayData.map((entry, index) => {
                const isCurrentPlayer = entry.address.toLowerCase() === walletAddress.toLowerCase();
                return (
                  <tr key={entry.address} className={isCurrentPlayer ? styles.playerHighlight : ''}>
                    <td>{isCurrentPlayer ? 'You' : index + 1}</td>
                    <td>{`${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}</td>
                    <td>{entry.score}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Nadxel Game</title>
        <meta name="description" content="Play Block Game" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </Head>
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
      `}</style>
      <div className={styles.body}>
        <canvas className={styles.canvas} ref={canvasRef} />
        <div id="connectweb3-screen" className={styles.connectWeb3Screen}>
          <div className={styles.connectWeb3Text}>NADXEL</div>
          <button
            className={styles.initialDisconnectWallet}
            onClick={() => open({ view: 'Connect' })}
            style={{
              fontFamily: 'Press Start 2P, cursive',
              padding: '10px 20px',
              fontSize: '1rem',
              cursor: 'pointer',
              background: '#00ff00',
              color: '#000',
              border: '2px solid #000',
              margin: '10px',
              transition: 'background-color 0.3s ease',
            }}
          >
            Connect Wallet
          </button>
          <div id="connectweb3-message" className={styles.errorMessage}>
            {error}
          </div>
          <div className={`${styles.decorText} ${styles.btc}`}>$BTC</div>
          <div className={`${styles.decorText} ${styles.eth}`}>$ETH</div>
          <div className={`${styles.decorText} ${styles.mon}`}>$MON</div>
          <div className={`${styles.decorText} ${styles.nad}`}>$NAD</div>
        </div>
        <div id="initial-screen" className={styles.initialScreen}>
          <button
            className={styles.leaderboardButtonInitial}
            onClick={() => {
              setIsLeaderboardVisible(true);
              console.log('Set leaderboard visibility to true');
            }}
          >
            Leaderboard
          </button>
          {renderLeaderboard(leaderboardData)}
          <div id="wallet-greeting" className={styles.walletGreeting}></div>
          <div className={styles.readyToPlay}>SPLIT BLOCK</div>
          <div className={styles.initialButtons}>
            <button
              className={styles.initialConnectWallet}
              onClick={handlePlayNow}
              disabled={isTxPending || isConfirming}
            >
              {isTxPending || isConfirming ? 'Signing...' : 'PLAY NOW!'}
            </button>
            <div className={styles.loadingBar} id="loading-bar">
              <div className={styles.loadingProgress} id="loading-progress"></div>
            </div>
            <button
              className={styles.initialDisconnectWallet}
              onClick={handleDisconnect}
            >
              DISCONNECT
            </button>
            <div id="initial-message" className={styles.errorMessage}>
              {error}
            </div>
          </div>
          <div className={`${styles.decorText} ${styles.btc}`}>$BTC</div>
          <div className={`${styles.decorText} ${styles.eth}`}>$ETH</div>
          <div className={`${styles.decorText} ${styles.mon}`}>$MON</div>
          <div className={`${styles.decorText} ${styles.nad}`}>$NAD</div>
        </div>
        <div id="game-screen" className={styles.gameScreen}>
          <div className={styles.header}>
            <button
              className={styles.backButton}
              onClick={resetToInitialScreen}
            >
              BACK
            </button>
            <div className={styles.centerDisplay}>
              <div className={styles.walletAddress}>
                {walletAddress ? `Wallet:${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : ''}
              </div>
              <div className={styles.scoreDisplay}>
                Points: <span id="score">{score}</span>
              </div>
            </div>
            <button
              className={styles.leaderboardButton}
              onClick={() => {
                setIsLeaderboardVisible(true);
                console.log('Set leaderboard visibility to true');
              }}
            >
              Leaderboard
            </button>
          </div>
          {renderLeaderboard(leaderboardData)}
          <div className={styles.gameOver} style={{ display: gameOver ? 'block' : 'none' }}>
            <div>Game Over!</div>
            <div className={styles.gameOverScore}>
              Points: <span id="final-score">{score}</span>
            </div>
            <div className={styles.gameOverButtons}>
              <button
                className={styles.playAgain}
                onClick={resetToInitialScreen}
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}