async function roundWin(team) {
  if (!match) {
    throw new Error("初期データがありません");
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  const result = await runTransaction(
    matchRef,
    value => {
      if (!value?.teamA || !value?.teamB) return;

      const scoreA = Math.max(
        0, Math.trunc(Number(value.teamA.score) || 0)
      );

      const scoreB = Math.max(
        0, Math.trunc(Number(value.teamB.score) || 0)
      );

      const round = scoreA + scoreB + 1;

      const history = {
        ...(value.roundHistory || {})
      };

      // 同一ラウンドは重複登録しない
      if (history[round]) return;

      // ラウンド勝利履歴
      history[round] = {
        team,
        round,
        recordedAt: now
      };

      value.roundHistory = history;

      // ROUND WIN演出
      value.roundEvent = {
        id,
        type: "roundWin",
        team,
        expiresAt: now + 5000
      };

      // PHASE 3.9 - SPIKE状態リセット
      value.spikeStatus = {
        status: "none",
        holder: "none",
        site: "A"
      };

      return value;
    },
    { applyLocally: false }
  );

  if (!result.committed) {
    throw new Error(
      "記録済みのラウンド、または試合データがありません"
    );
  }
}
