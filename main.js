import { ITEMS_CONFIG, PRE_DETERMINED_WIN_RATE, REEL_SPEEDS, SCATTER_ID, SCATTER_CHANCE, SLOT_CONFIG } from './config.js';
import { SlotEngine } from './SlotEngine.js';
import { SlotRenderer } from './SlotRenderer.js';

class SlotMachine {
    constructor() {
        this.canvas = document.getElementById('slotCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.spinButton = document.getElementById('spinButton');
        
        // UI Elements
        this.messageBox = document.getElementById('freeSpinMessage');
        this.fsScreen = document.getElementById('freeSpinScreen');
        this.fsCountText = document.getElementById('fsCount');
        
        this.balance = 1000.00;
        this.bet = 10.00;
        this.isSpinning = false;
        this.isWinState = false;
        this.winningItems = [];
        this.freeSpinsLeft = 0;
        this.isFreeSpinMode = false;
        this.freeSpinTotalWin = 0; // Free Spin အားလုံးအတွက် စုစုပေါင်း အနိုင်ငွေ

        this.reelOffsets = [0, 0, 0, 0, 0];
        this.reelStates = Array(5).fill('stopped');
        this.currentReelSpeeds = [...REEL_SPEEDS];
        this.itemImages = [];
        this.reels = [];

        this.spinButton.addEventListener('click', () => this.spin());
        
        // ပုံတွေကို အရင် Load လုပ်ပြီးမှ ဂိမ်းကို စတင်ပါမည်
        this.loadImages().then(() => {
            console.log("ဂိမ်းစတင်ရန် အသင့်ဖြစ်ပါပြီ");
            this.init();
        });
    }

    async loadImages() {
        this.itemImages = []; 
        const promises = ITEMS_CONFIG.map(item => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = item.src;
                img.onload = () => {
                    this.itemImages.push({ img, val: item.val, id: item.id });
                    resolve();
                };
                img.onerror = () => {
                    console.error(`ပုံတင်မရပါ: ${item.src}`);
                    resolve(); 
                };
            });
        });
        await Promise.all(promises);
    }

    init() {
        this.canvas.width = SLOT_CONFIG.canvasWidth;
        this.canvas.height = SLOT_CONFIG.canvasHeight;
        this.reelWidth = (this.canvas.width - (SLOT_CONFIG.reels * SLOT_CONFIG.spacing)) / SLOT_CONFIG.reels;
        this.rowHeight = this.canvas.height / SLOT_CONFIG.rows;
        
        // အစပိုင်းတွင် ပုံများ အသင့်ရှိနေစေရန် Reels များကို တည်ဆောက်ပါမည်
        this.reels = Array(5).fill(0).map((_, i) => 
            Array(6).fill(0).map(() => this.getRandomItem(i))
        );
        
        this.animate();
    }

    getRandomItem(reelIndex) {
        let filteredConfig = [...ITEMS_CONFIG];
        
        // Col 1, 3 တွင် Scatter မကျရန်
        if (reelIndex === 1 || reelIndex === 3) {
            filteredConfig = ITEMS_CONFIG.filter(item => item.id !== SCATTER_ID);
        }
        
        // Col 0, 2, 4 တွင် Scatter တစ်ခုထက်ပိုမကျရန်
        if ((reelIndex === 0 || reelIndex === 2 || reelIndex === 4) && this.reels[reelIndex]) {
            if (this.reels[reelIndex].some(item => item && item.id === SCATTER_ID)) {
                filteredConfig = ITEMS_CONFIG.filter(item => item.id !== SCATTER_ID);
            }
        }

        const totalWeight = filteredConfig.reduce((sum, item) => sum + item.weight, 0);
        let randomNum = Math.random() * totalWeight;
        let selectedConfig = filteredConfig[0];

        for (const config of filteredConfig) {
            if (randomNum < config.weight) {
                selectedConfig = config;
                break;
            }
            randomNum -= config.weight;
        }

        // Error မတက်အောင် Image Array ထဲတွင် သေချာရှာပါသည်
        const foundImg = this.itemImages.find(img => img.id === selectedConfig.id);
        return foundImg || this.itemImages[0];
    }

    spin() {
        if (this.isSpinning) return;
        
        if (this.freeSpinsLeft > 0) {
            this.isFreeSpinMode = true;
            this.freeSpinsLeft--;
            this.fsCountText.innerText = this.freeSpinsLeft;
            
            // UI မှာ လက်ရှိ စုထားတဲ့ win amount ကို ပြမယ်
            document.getElementById('win-amount').innerText = ` ${this.freeSpinTotalWin.toFixed(2)}`;
            
            if(this.fsScreen) this.fsScreen.style.display = 'none'; 
            this.canvas.style.opacity = "1";
        } else {
            // Free Spin ၈ ကြိမ်လုံး ပြီးသွားချိန်
            if (this.isFreeSpinMode && this.freeSpinsLeft === 0) {
                this.showTotalWinSummary(); 
                return;
            }

            if (this.balance < this.bet) return;
            this.isFreeSpinMode = false;
            this.freeSpinTotalWin = 0; 
            if(this.fsScreen) this.fsScreen.style.display = 'none';
            this.canvas.style.opacity = "1";
            this.balance -= this.bet;
            document.getElementById('balance').innerText = this.balance.toFixed(2);
        }

        this.isSpinning = true;
        this.isWinState = false;
        this.isAnticipating = false;
        this.currentReelSpeeds = [...REEL_SPEEDS];
        
        this.determineResult();

        this.reelStates.forEach((_, i) => {
            setTimeout(() => this.reelStates[i] = 'spinning', i * 50);
        });

        setTimeout(() => this.stopReels(), 1500);
    }

    determineResult() {
        const chance = Math.random() * 100;
        if (chance < SCATTER_CHANCE && !this.isFreeSpinMode) {
            this.targetSymbolId = SCATTER_ID;
        } else if (chance < PRE_DETERMINED_WIN_RATE) {
            const options = ITEMS_CONFIG.filter(i => i.id !== SCATTER_ID);
            this.targetSymbolId = options[Math.floor(Math.random() * options.length)].id;
            this.winLength = Math.floor(Math.random() * 3) + 3;
        } else {
            this.targetSymbolId = null;
        }
    }

    stopReels() {
        const scatterSymbol = this.itemImages.find(i => i.id === SCATTER_ID);

        this.reelStates.forEach((_, i) => {
            setTimeout(() => {
                if (this.targetSymbolId === SCATTER_ID) {
                    if (i === 0 || i === 2 || i === 4) {
                        const hasScatter = this.reels[i].some(item => item && item.id === SCATTER_ID);
                        if (!hasScatter) {
                            const randomRow = Math.floor(Math.random() * 3) + 1;
                            this.reels[i][randomRow] = scatterSymbol;
                        }
                    }
                } else if (this.targetSymbolId && i < this.winLength) {
                    const winSymbol = this.itemImages.find(img => img.id === this.targetSymbolId);
                    this.reels[i][2] = winSymbol;
                }

                this.reelStates[i] = 'stopping';

                if (i === 3 && this.reels[0].slice(1,4).some(s => s && s.id === SCATTER_ID) && 
                    this.reels[2].slice(1,4).some(s => s && s.id === SCATTER_ID)) {
                    this.isAnticipating = true;
                    this.currentReelSpeeds[4] = 4;
                }

                if (i === 4) {
                    const stopDelay = this.isAnticipating ? 1500 : 600;
                    setTimeout(() => this.checkWin(), stopDelay);
                }
            }, i * 400);
        });
    }

    checkWin() {
        this.isSpinning = false;
        const scatterCount = SlotEngine.countScatters(this.reels);
        
        if (scatterCount >= 3 && !this.isFreeSpinMode) {
            this.freeSpinsLeft = 8;
            this.freeSpinTotalWin = 0; 
            this.showFreeSpinUI(); 
            return; 
        }

        this.processNormalWins();
        
        if (this.freeSpinsLeft > 0) {
            setTimeout(() => {
                if(this.fsScreen) {
                    this.fsScreen.style.display = 'flex';
                    this.fsCountText.innerText = this.freeSpinsLeft;
                    this.canvas.style.opacity = "0.2";
                }
                setTimeout(() => this.spin(), 1500);
            }, 1000);
        } else if (this.isFreeSpinMode) {
            // Free Spin အားလုံးပြီးသွားလျှင် စာတန်းပြရန်
            setTimeout(() => this.showTotalWinSummary(), 1000);
        }
    }

    showFreeSpinUI() {
        if (this.messageBox) {
            this.messageBox.style.display = 'block';
            this.canvas.style.opacity = "0.3";
            setTimeout(() => {
                this.messageBox.style.display = 'none';
                if (this.fsScreen) {
                    this.fsScreen.style.display = 'flex';
                    this.fsCountText.innerText = this.freeSpinsLeft;
                    setTimeout(() => this.spin(), 2000);
                }
            }, 2000);
        }
    }

    showTotalWinSummary() {
        this.isFreeSpinMode = false;
        // ၈ ကြိမ်စာ စုစုပေါင်းနိုင်ငွေကို စာတန်းဖြင့်ပြမည်
        this.messageBox.innerHTML = `CONGRATULATIONS! <br> TOTAL WIN <br> $${this.freeSpinTotalWin.toFixed(2)}`;
        this.messageBox.style.display = 'block';
        this.canvas.style.opacity = "0.3";
        
        // ပိုက်ဆံကို Balance ထဲ ပေါင်းထည့်မည်
        this.balance += this.freeSpinTotalWin;
        document.getElementById('balance').innerText = this.balance.toFixed(2);
        
        setTimeout(() => {
            this.messageBox.style.display = 'none';
            this.messageBox.innerHTML = `SCATTER! <br> 8 FREE SPINS <br> ACTIVATED`; // စာသားမူလအတိုင်းပြန်ပြင်ခြင်း
            this.freeSpinTotalWin = 0;
            this.canvas.style.opacity = "1";
            document.getElementById('win-amount').innerText = "0.00";
        }, 4000);
    }

    processNormalWins() {
        let currentTurnWin = 0;
        let winsFound = [];
        for (let row = 1; row <= 3; row++) {
            const firstItem = this.reels[0][row];
            if (!firstItem || firstItem.id === SCATTER_ID) continue;
            const paths = SlotEngine.findPaths(this.reels, 0, row, firstItem.id);
            paths.forEach(p => {
                if (p.length >= 3) {
                    currentTurnWin += this.bet * (firstItem.val / 2) * (p.length - 2);
                    winsFound.push(...p);
                }
            });
        }

        if (currentTurnWin > 0) {
            this.isWinState = true;
            this.winningItems = Array.from(new Set(winsFound.map(JSON.stringify)), JSON.parse);
            
            if (this.isFreeSpinMode) {
                // Free Spin ဖြစ်လျှင် စုစုပေါင်းထဲပဲ ပေါင်းထည့်မည်
                this.freeSpinTotalWin += currentTurnWin; 
                document.getElementById('win-amount').innerText = ` ${this.freeSpinTotalWin.toFixed(2)}`;
            } else {
                this.balance += currentTurnWin;
                document.getElementById('balance').innerText = this.balance.toFixed(2);
                document.getElementById('win-amount').innerText = currentTurnWin.toFixed(2);
            }
        }
    }

    updateReels() {
        for (let i = 0; i < 5; i++) {
            if (this.reelStates[i] === 'spinning' || (this.reelStates[i] === 'stopping' && this.reelOffsets[i] > 0)) {
                this.reelOffsets[i] += this.currentReelSpeeds[i];
                if (this.reelOffsets[i] >= this.rowHeight) {
                    this.reelOffsets[i] = 0;
                    this.reels[i].unshift(this.getRandomItem(i));
                    this.reels[i].pop();
                }
            } else if (this.reelStates[i] === 'stopping') {
                this.reelOffsets[i] *= 0.85;
                if (this.reelOffsets[i] < 1) {
                    this.reelOffsets[i] = 0;
                    this.reelStates[i] = 'stopped';
                }
            }
        }
    }

    animate() {
        this.updateReels();
        SlotRenderer.draw(this.ctx, this);
        requestAnimationFrame(() => this.animate());
    }
}

new SlotMachine();
