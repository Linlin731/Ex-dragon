import { SCATTER_ID, SLOT_CONFIG } from './config.js';

export class SlotRenderer {
    static draw(ctx, state) {
        const { reels, reelOffsets, isWinState, winningItems, isAnticipating, reelWidth, rowHeight } = state;
        
        // ၁။ Canvas ကို အရင်ရှင်းပါ
        ctx.clearRect(0, 0, SLOT_CONFIG.canvasWidth, SLOT_CONFIG.canvasHeight);

        for (let i = 0; i < SLOT_CONFIG.reels; i++) {
            const x = i * (reelWidth + SLOT_CONFIG.spacing);
            
            for (let j = 0; j < reels[i].length; j++) {
                const item = reels[i][j];
                if (!item || !item.img) continue; // ပုံရှိမှ ဆွဲပါ

                const y = (j - 1) * rowHeight + reelOffsets[i];
                const size = reelWidth * 0.85;

                ctx.save(); // Loop တစ်ခုချင်းစီအတွက် အခြေအနေကို မှတ်ထားပါ

                // Reel တစ်ခုချင်းစီရဲ့ ဘောင်ထဲမှာပဲ ပုံပေါ်အောင် Clip လုပ်ခြင်း
                ctx.beginPath();
                ctx.rect(x, 0, reelWidth, SLOT_CONFIG.canvasHeight);
                ctx.clip();

                // Scatter Glow Effect
                if (item.id === SCATTER_ID && (isWinState || isAnticipating)) {
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = "gold";
                }

                // Win Highlight
                if (isWinState) {
                    const isWinner = winningItems.some(w => w.col === i && w.row === j);
                    if (!isWinner) {
                        ctx.globalAlpha = 0.3;
                        ctx.filter = 'grayscale(100%)';
                    }
                }

                // ပုံကို ဆွဲပါ
                ctx.drawImage(
                    item.img, 
                    x + (reelWidth - size) / 2, 
                    y + (rowHeight - size) / 2, 
                    size, 
                    size
                );

                ctx.restore(); // Clip လုပ်ထားတာကို ပြန်ဖြုတ်ပါ (ဒါမှ နောက်ပုံ ထပ်ဆွဲလို့ရမှာပါ)
            }
        }
    }
}
