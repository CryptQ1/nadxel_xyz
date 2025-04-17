// lib/server.js
export let ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onclose = () => {
  console.log('WebSocket closed, reconnecting...');
  setTimeout(() => {
    ws = new WebSocket('ws://localhost:3000');
    ws.onopen = ws.onopen;
    ws.onmessage = ws.onmessage;
    ws.onerror = ws.onerror;
    ws.onclose = ws.onclose;
  }, 1000);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

export function isValidLeaderboardEntry(entry: any): boolean {
  return (
    entry &&
    typeof entry.address === 'string' &&
    entry.address.length > 0 &&
    typeof entry.score === 'number' &&
    entry.score >= 0
  );
}

export function sendScoreToServer(score: number, address: string, messageElement: HTMLElement) {
  console.log('Attempting to send score to server:', { score, address });
  if (ws.readyState === WebSocket.OPEN) {
    const message = JSON.stringify({ type: 'score', score, address });
    ws.send(message);
    console.log('Score sent to server:', message);
    // messageElement.textContent = `Score ${score} sent to server!`;
    setTimeout(() => {
      messageElement.textContent = '';
    }, 3000);
  } else {
    console.error('WebSocket not connected:', ws.readyState);
    messageElement.textContent = 'Failed to send score: WebSocket not connected';
    setTimeout(() => {
      messageElement.textContent = '';
    }, 3000);
  }
}