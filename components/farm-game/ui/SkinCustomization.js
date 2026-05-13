"use client";

export default class SkinCustomization {
    constructor(scene) {
        this.scene = scene;
        this.isVisible = false;
        this.selectedDefenderType = null;
        this.currentSkins = {
            chog: 'chog_idle',
            molandak: 'molandak_idle', 
            moyaki: 'moyaki_idle',
            keon: 'keon_idle'
        };
        
        // Available skins for each defender type
        this.availableSkins = {
            chog: [
                { key: 'chog_idle', name: 'Default Chog', unlocked: true },
                { key: 'jumapel_idle', name: 'Jumapel', unlocked: true, requirement: 100 }
            ],
            keon: [
                { key: 'keon_idle', name: 'Default Keon', unlocked: true },
                { key: 'skrumpet_idle', name: 'Skrumpet', unlocked: true, requirement: 200 }
            ],
            molandak: [
                { key: 'molandak_idle', name: 'Default Molandak', unlocked: true },
                { key: 'erkin_idle', name: 'Erkin', unlocked: true, requirement: 150 }
            ],
            moyaki: [
                { key: 'moyaki_idle', name: 'Default Moyaki', unlocked: true },
                { key: 'realnads_idle', name: 'RealNads', unlocked: true, requirement: 300 }
            ]
        };
        
        this.container = null;
        this.skinPanels = [];
        this.previewSprite = null;
        
        this.loadSkinTextures();
        this.checkUnlockedSkins();
    }
    
    loadSkinTextures() {
        // Load additional skin textures that aren't already loaded
        const textureMap = {
            'jumapel_idle': '/defense/jumapel_idle.png',
            'jumapel_attack': '/defense/jumapel_attack.png',
            'skrumpet_idle': '/defense/skrumpet_idle.png',
            'skrumpet_attack': '/defense/skrumpet_attack.png',
            'erkin_idle': '/defense/erkin_idle.png',
            'erkin_attack': '/defense/erkin_attack.png',
            'realnads_idle': '/defense/realnads_idle.png',
            'realnads_attack': '/defense/realnads_attack.png'
        };
        
        Object.entries(textureMap).forEach(([key, path]) => {
            if (!this.scene.textures.exists(key)) {
                this.scene.load.image(key, path);
            }
        });
        
        // Start loading if needed
        if (this.scene.load.list.size > 0) {
            this.scene.load.start();
        }
    }
    
    checkUnlockedSkins() {
        const playerScore = this.scene.score || 0;
        
        Object.keys(this.availableSkins).forEach(defenderType => {
            this.availableSkins[defenderType].forEach(skin => {
                if (skin.requirement && playerScore >= skin.requirement) {
                    skin.unlocked = true;
                }
            });
        });
    }
    
    show(defenderType = 'chog') {
        if (this.isVisible) return;
        
        this.selectedDefenderType = defenderType;
        this.isVisible = true;
        this.checkUnlockedSkins();
        this.createUI();
    }
    
    hide() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        this.skinPanels = [];
        this.previewSprite = null;
    }
    
    createUI() {
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;
        
        // Create main container
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(10000);
        
        // Background overlay
        const overlay = this.scene.add.rectangle(0, 0, 
            this.scene.cameras.main.width, 
            this.scene.cameras.main.height, 
            0x000000, 0.7);
        overlay.setOrigin(0, 0);
        this.container.add(overlay);
        
        // Main panel
        const panelWidth = 600;
        const panelHeight = 500;
        const mainPanel = this.scene.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x2a2a2a);
        mainPanel.setStrokeStyle(3, 0x4a4a4a);
        this.container.add(mainPanel);
        
        // Title
        const title = this.scene.add.text(centerX, centerY - 220, 
            `${this.selectedDefenderType.toUpperCase()} SKINS`, {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        title.setOrigin(0.5);
        this.container.add(title);
        
        // Close button
        const closeButton = this.scene.add.rectangle(centerX + 280, centerY - 220, 40, 40, 0xff4444);
        closeButton.setStrokeStyle(2, 0xffffff);
        const closeText = this.scene.add.text(centerX + 280, centerY - 220, 'X', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        closeText.setOrigin(0.5);
        closeButton.setInteractive({ useHandCursor: true });
        closeButton.on('pointerdown', () => this.hide());
        this.container.add([closeButton, closeText]);
        
        // Preview area
        this.createPreviewArea(centerX, centerY - 100);
        
        // Skin selection area
        this.createSkinSelection(centerX, centerY + 50);
        
        // Apply button
        const applyButton = this.scene.add.rectangle(centerX, centerY + 200, 150, 40, 0x44aa44);
        applyButton.setStrokeStyle(2, 0xffffff);
        const applyText = this.scene.add.text(centerX, centerY + 200, 'APPLY', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        });
        applyText.setOrigin(0.5);
        applyButton.setInteractive({ useHandCursor: true });
        applyButton.on('pointerdown', () => this.applySkin());
        this.container.add([applyButton, applyText]);
    }
    
    createPreviewArea(centerX, centerY) {
        // Preview background
        const previewBg = this.scene.add.rectangle(centerX, centerY, 120, 120, 0x1a1a1a);
        previewBg.setStrokeStyle(2, 0x4a4a4a);
        this.container.add(previewBg);
        
        // Preview sprite
        const currentSkin = this.currentSkins[this.selectedDefenderType];
        if (this.scene.textures.exists(currentSkin)) {
            this.previewSprite = this.scene.add.image(centerX, centerY, currentSkin);
            this.previewSprite.setDisplaySize(80, 80);
            this.container.add(this.previewSprite);
        }
        
        // Preview label
        const previewLabel = this.scene.add.text(centerX, centerY + 80, 'PREVIEW', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#cccccc'
        });
        previewLabel.setOrigin(0.5);
        this.container.add(previewLabel);
    }
    
    createSkinSelection(centerX, centerY) {
        const skins = this.availableSkins[this.selectedDefenderType];
        const startX = centerX - (skins.length * 110) / 2 + 55;
        
        skins.forEach((skin, index) => {
            const x = startX + (index * 110);
            const y = centerY;
            
            // Skin panel background
            const panelColor = skin.unlocked ? 0x3a3a3a : 0x2a2a2a;
            const panel = this.scene.add.rectangle(x, y, 100, 120, panelColor);
            panel.setStrokeStyle(2, skin.unlocked ? 0x4a4a4a : 0x666666);
            
            // Highlight current selection
            if (this.currentSkins[this.selectedDefenderType] === skin.key) {
                panel.setStrokeStyle(3, 0x44aa44);
            }
            
            // Skin sprite
            let skinSprite;
            if (skin.unlocked && this.scene.textures.exists(skin.key)) {
                skinSprite = this.scene.add.image(x, y - 20, skin.key);
                skinSprite.setDisplaySize(60, 60);
            } else {
                // Locked or missing texture
                skinSprite = this.scene.add.rectangle(x, y - 20, 60, 60, 0x666666);
                if (!skin.unlocked) {
                    const lockIcon = this.scene.add.text(x, y - 20, '🔒', {
                        fontSize: '24px'
                    });
                    lockIcon.setOrigin(0.5);
                    this.container.add(lockIcon);
                }
            }
            
            // Skin name
            const nameText = this.scene.add.text(x, y + 25, skin.name, {
                fontSize: '10px',
                fontFamily: 'Arial',
                color: skin.unlocked ? '#ffffff' : '#888888',
                align: 'center',
                wordWrap: { width: 90 }
            });
            nameText.setOrigin(0.5);
            
            // Requirement text for locked skins
            if (!skin.unlocked && skin.requirement) {
                const reqText = this.scene.add.text(x, y + 45, `Score: ${skin.requirement}`, {
                    fontSize: '8px',
                    fontFamily: 'Arial',
                    color: '#ffaa00'
                });
                reqText.setOrigin(0.5);
                this.container.add(reqText);
            }
            
            // Make interactive if unlocked
            if (skin.unlocked) {
                panel.setInteractive({ useHandCursor: true });
                panel.on('pointerdown', () => {
                    this.selectSkin(skin.key);
                    // Apply skin immediately when selected
                    this.applySkin();
                });
                panel.on('pointerover', () => {
                    panel.setStrokeStyle(3, 0x66aa66);
                    this.updatePreview(skin.key);
                });
                panel.on('pointerout', () => {
                const normalizedType = this.selectedDefenderType.toLowerCase();
                const isSelected = this.currentSkins[normalizedType] === skin.key;
                panel.setStrokeStyle(isSelected ? 3 : 2, isSelected ? 0x44aa44 : 0x4a4a4a);
            });
            }
            
            this.container.add([panel, skinSprite, nameText]);
            this.skinPanels.push({ panel, skin });
        });
    }
    
    selectSkin(skinKey) {
        const normalizedType = this.selectedDefenderType.toLowerCase();
        this.currentSkins[normalizedType] = skinKey;
        console.log(`[SKIN DEBUG] Selected skin ${skinKey} for ${normalizedType}. Current skins:`, this.currentSkins);
        this.updatePreview(skinKey);
        
        // Update panel highlights
        this.skinPanels.forEach(({ panel, skin }) => {
            if (skin.key === skinKey) {
                panel.setStrokeStyle(3, 0x44aa44);
            } else if (skin.unlocked) {
                panel.setStrokeStyle(2, 0x4a4a4a);
            }
        });
    }
    
    updatePreview(skinKey) {
        if (this.previewSprite && this.scene.textures.exists(skinKey)) {
            this.previewSprite.setTexture(skinKey);
        }
    }
    
    applySkin() {
        if (this.selectedDefenderType) {
            const normalizedType = this.selectedDefenderType.toLowerCase();
            console.log(`[SKIN DEBUG] Applied skin to ${normalizedType}. Current skins:`, this.currentSkins);
            this.saveSkinPreferences();
            this.updateExistingDefenders();
            this.showConfirmation();
        }
        
        // Don't close panel automatically - let user continue selecting
        // this.hide();
    }
    
    saveSkinPreferences() {
        try {
            localStorage.setItem('mondefense_skins', JSON.stringify(this.currentSkins));
        } catch (error) {
            console.warn('Could not save skin preferences:', error);
        }
    }
    
    loadSkinPreferences() {
        try {
            const saved = localStorage.getItem('mondefense_skins');
            console.log('[SKIN DEBUG] Loading skin preferences from localStorage:', saved);
            if (saved) {
                const savedSkins = JSON.parse(saved);
                console.log('[SKIN DEBUG] Parsed saved skins:', savedSkins);
                this.currentSkins = { ...this.currentSkins, ...savedSkins };
                console.log('[SKIN DEBUG] Updated currentSkins after loading:', this.currentSkins);
            } else {
                console.log('[SKIN DEBUG] No saved skin preferences found, using defaults');
            }
        } catch (error) {
            console.warn('Could not load skin preferences:', error);
        }
    }
    
    updateExistingDefenders() {
        if (!this.scene.defenses) return;
        
        this.scene.defenses.forEach(defense => {
            const normalizedDefenseType = defense.type.toLowerCase();
            const normalizedSelectedType = this.selectedDefenderType.toLowerCase();
            
            if (normalizedDefenseType === normalizedSelectedType && defense.sprite) {
                const newSkin = this.currentSkins[normalizedSelectedType];
                console.log(`[SKIN DEBUG] Updating existing ${defense.type} defense with skin:`, newSkin);
                if (this.scene.textures.exists(newSkin)) {
                    defense.sprite.setTexture(newSkin);
                    // Update the skinKey so attacks use the correct skin
                    defense.skinKey = newSkin;
                }
            }
        });
    }
    
    showConfirmation() {
        const centerX = this.scene.cameras.main.width / 2;
        const centerY = this.scene.cameras.main.height / 2;
        
        const confirmText = this.scene.add.text(centerX, centerY - 50, 'SKIN APPLIED!', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#44aa44',
            fontStyle: 'bold'
        });
        confirmText.setOrigin(0.5);
        confirmText.setDepth(10001);
        
        // Fade out confirmation
        this.scene.tweens.add({
            targets: confirmText,
            alpha: 0,
            y: centerY - 100,
            duration: 2000,
            onComplete: () => confirmText.destroy()
        });
    }
    
    getSkinForDefender(defenderType) {
        const normalizedType = defenderType.toLowerCase();
        const selectedSkin = this.currentSkins[normalizedType];
        console.log(`[SKIN DEBUG] Getting skin for ${defenderType} (normalized: ${normalizedType}):`, selectedSkin);
        console.log(`[SKIN DEBUG] Current skins state:`, this.currentSkins);
        return selectedSkin || `${normalizedType}_idle`;
    }
    
    // Initialize skin preferences on game start
    init() {
        this.loadSkinPreferences();
    }
}