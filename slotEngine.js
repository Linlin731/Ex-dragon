import { ITEMS_CONFIG, SCATTER_ID } from './config.js';

export class SlotEngine {
    // ပုံမှန် အနိုင်လိုင်းများကို တွက်ချက်ခြင်း
    static findPaths(reels, col, row, targetId) {
        let currentPath = [{ col, row }];
        let nextCol = col + 1;
        if (nextCol >= 5) return [currentPath];
        
        let foundInNext = [];
        for (let nextRow = 1; nextRow <= 3; nextRow++) {
            if (reels[nextCol][nextRow].id === targetId) foundInNext.push(nextRow);
        }
        
        if (foundInNext.length === 0) return [currentPath];
        let allSubPaths = [];
        foundInNext.forEach(nextRow => {
            let subPaths = this.findPaths(reels, nextCol, nextRow, targetId);
            subPaths.forEach(p => allSubPaths.push([...currentPath, ...p]));
        });
        return allSubPaths;
    }

    // Scatter အရေအတွက်ကို စစ်ဆေးခြင်း
    static countScatters(reels) {
        let count = 0;
        for (let i = 0; i < 5; i++) {
            // Row 1 ကနေ 3 အတွင်းမှာပဲ စစ်သည်
            for (let rowIdx = 1; rowIdx <= 3; rowIdx++) {
                if (reels[i][rowIdx] && reels[i][rowIdx].id === SCATTER_ID) {
                    count++;
                    break; // Reel တစ်ခုမှာ တစ်လုံးပဲ တွက်မည်
                }
            }
        }
        return count;
    }
}
