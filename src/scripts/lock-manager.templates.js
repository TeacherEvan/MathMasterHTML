// src/scripts/lock-manager.templates.js - Lock manager HTML templates
console.log("🔒 LockManager templates loading...");

(function attachLockManagerTemplates() {
  const templates = (window.LockManagerTemplates =
    window.LockManagerTemplates || {});

  templates.getBasicLockMarkup = function getBasicLockMarkup() {
    return `
                <div class="lock-component-wrapper">
                    <div class="basic-lock-container">
                        <div class="basic-lock-shackle"></div>
                        <div class="basic-lock-body">
                            <div class="basic-lock-keyhole"></div>
                            <div class="basic-lock-bolts">
                                <div class="bolt bolt-1"></div>
                                <div class="bolt bolt-2"></div>
                                <div class="bolt bolt-3"></div>
                                <div class="bolt bolt-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    .basic-lock-container {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) scale(1.8);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        transform-origin: center center;
                        width: 120px;
                        height: 160px;
                        z-index: 10;
                    }
                    
                    .basic-lock-shackle {
                        width: 50px;
                        height: 38px;
                        border: 7px solid #666;
                        border-bottom: none;
                        border-radius: 25px 25px 0 0;
                        margin-bottom: 6px;
                        background: transparent;
                        box-shadow: inset 0 0 6px rgba(0,0,0,0.3);
                    }
                    
                    .basic-lock-body {
                        width: 75px;
                        height: 100px;
                        background: linear-gradient(145deg, #2a2a2a, #404040);
                        border-radius: 10px;
                        position: relative;
                        border: 2px solid #555;
                        box-shadow: 
                            0 5px 10px rgba(0,0,0,0.3),
                            inset 0 0 6px rgba(0,0,0,0.2);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    
                    .basic-lock-keyhole {
                        width: 15px;
                        height: 15px;
                        background: #000;
                        border-radius: 50%;
                        position: relative;
                        border: 1px solid #333;
                    }
                    
                    .basic-lock-keyhole::after {
                        content: '';
                        position: absolute;
                        bottom: -8px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 5px;
                        height: 10px;
                        background: #000;
                        border: 1px solid #333;
                        border-top: none;
                    }
                    
                    .basic-lock-bolts {
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                    }
                    
                    .bolt {
                        position: absolute;
                        width: 10px;
                        height: 10px;
                        background: #333;
                        border-radius: 50%;
                        box-shadow: inset 0 0 2px rgba(0,0,0,0.5);
                    }
                    
                    .bolt-1 { top: 12px; left: 12px; }
                    .bolt-2 { top: 12px; right: 12px; }
                    .bolt-3 { bottom: 12px; left: 12px; }
                    .bolt-4 { bottom: 12px; right: 12px; }
                </style>
            `;
  };
})();
