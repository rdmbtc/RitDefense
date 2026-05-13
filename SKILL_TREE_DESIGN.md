# RitDefense Skill Tree System Design

## Overview
This document outlines the skill tree system for RitDefense characters. Each defender has unique abilities and upgrade paths that enhance their effectiveness against different enemy types.

## Current Defenders Analysis

### 1. CHOG (Nature Magic Defender)
- **Cost**: 25 coins
- **Target Types**: Birds only
- **Magic Type**: Nature
- **Current Stats**: Basic range, moderate damage, bird-focused

### 2. MOLANDAK (Ice Magic Guardian)
- **Cost**: 50 coins  
- **Target Types**: Rabbits and Birds
- **Magic Type**: Ice
- **Current Stats**: Higher cost, dual targeting, ice effects

### 3. MOYAKI (Fire Magic Warrior)
- **Cost**: 80-200 coins (unlocked at wave 8)
- **Target Types**: Rabbits, Foxes, Birds
- **Magic Type**: Fire
- **Current Stats**: Most expensive, multi-target, fire damage

### 4. KEON (Advanced Defender)
- **Target Types**: All enemy types (bird, rabbit, fox, slime, ghost, skeleton, bat, spider, wolf, snake, goblin, dragon, demon)
- **Current Stats**: Universal targeting, high-tier defender

## Enemy Types to Counter
- **Basic**: Bird, Rabbit, Fox, Slime, Bat
- **Advanced**: Ghost, Skeleton, Spider, Snake, Wolf
- **Elite**: Goblin, Dragon, Demon

---

## Enemy Counterbalance Features

To maintain game balance against powerful defender skills, enemies will gain new abilities and features:

### Enhanced Enemy Types

#### Elite Variants (Appear from Wave 10+)
- **Elite Bird** - 50% magic resistance, immune to knockback effects
- **Elite Rabbit** - Regenerates health over time, +30% speed when below 50% health  
- **Elite Fox** - Can dodge attacks (15% chance), leaves stealth trails
- **Elite Slime** - Splits into 2 smaller slimes when killed, immune to poison
- **Elite Ghost** - Phases through some defenses, takes reduced damage from physical attacks
- **Elite Skeleton** - Resurrects once per wave with 25% health
- **Elite Bat** - Swarm behavior - gains damage bonus when near other bats
- **Elite Spider** - Webs slow nearby defenders by 20% for 3 seconds
- **Elite Wolf** - Pack leader - buffs nearby enemies with +25% damage
- **Elite Snake** - Venomous bite reduces defender damage by 15% for 5 seconds
- **Elite Goblin** - Throws rocks that stun defenders for 1 second
- **Elite Dragon** - Breathes fire in cone, dealing area damage to multiple defenders
- **Elite Demon** - Aura of fear reduces all defender effectiveness by 10% in large radius

#### Boss Enemies (Every 5th Wave)
- **Ancient Dragon** (Wave 15, 25, 35...)
  - Massive health pool (10x normal dragon)
  - Fire breath attack hits all defenders in line
  - Summons 3 fire elementals every 30 seconds
  - Immune to ultimate abilities for first 50% of health

- **Lich King** (Wave 20, 30, 40...)
  - Necromancy: Resurrects fallen enemies as undead
  - Dark magic: Disables random defender skills for 10 seconds
  - Soul drain: Steals health from defenders to heal itself
  - Death explosion: Damages all defenders when defeated

### Adaptive Enemy Mechanics

#### Intelligence System
- Enemies learn from player strategies and adapt:
  - If too many ice defenders → More fire-resistant enemies spawn
  - If too many area attacks → More spread-out enemy formations
  - If ultimate abilities used frequently → Enemies gain magic resistance

#### Environmental Hazards
- **Poison Clouds** (Wave 12+): Some enemies leave toxic areas that damage defenders
- **Ice Storms** (Wave 15+): Periodic storms slow all defenders for 5 seconds
- **Meteor Showers** (Wave 18+): Random meteors damage defenders and create craters
- **Shadow Rifts** (Wave 20+): Portals spawn additional enemies mid-wave

#### Counter-Skill Abilities
- **Spell Reflection** (Elite Mages): 25% chance to reflect magical attacks back
- **Armor Piercing** (Elite Warriors): Ignores 50% of defender armor/shields
- **Skill Disruption** (Elite Assassins): Silences defender abilities for 3 seconds on hit
- **Healing Aura** (Elite Clerics): Heals nearby enemies over time
- **Speed Boost** (Elite Scouts): Grants temporary speed boost to nearby enemies

---

## SKILL TREE DESIGN

### CHOG - Nature Magic Defender
**Theme**: Specialized bird hunter with nature-based crowd control

#### Tier 1 Skills (Unlock at Level 1)
1. **Wind Gust** (500 score to unlock)
   - Increases attack range by 25%
   - Adds knockback effect to birds
   - *"Harness the power of wind to extend reach"*
   - **Requires defeating 50 enemies**

2. **Sharp Eyes** (750 score to unlock)
   - +20% critical hit chance against birds
   - Reveals bird health bars permanently
   - *"Enhanced vision for precise targeting"*
   - **Requires defeating 75 enemies**

#### Tier 2 Skills (Unlock at Level 5)
3. **Thorn Barrier** (2000 score to unlock)
   - Creates thorny vines that slow enemies by 30% in a small area
   - Duration: 5 seconds, Cooldown: 15 seconds
   - *"Nature's defense against intruders"*
   - **Requires defeating 200 enemies**

4. **Dual Target** (2500 score to unlock)
   - Can now target rabbits in addition to birds
   - -15% damage to maintain balance
   - *"Expanding natural awareness"*
   - **Requires defeating 250 enemies**

#### Tier 3 Skills (Unlock at Level 10)
5. **Nature's Wrath** (5000 score to unlock)
   - Ultimate ability: Summons a storm that damages all flying enemies on screen
   - Damage: 50% of current attack power to all birds
   - Cooldown: 45 seconds
   - *"Call upon nature's fury"*
   - **Requires defeating 500 enemies**

6. **Poison Spores** (4000 score to unlock)
   - Attacks apply poison that deals damage over time
   - Poison lasts 3 seconds, deals 10% attack damage per second
   - *"Toxic nature magic"*
   - **Requires defeating 400 enemies**

---

### MOLANDAK - Ice Magic Guardian
**Theme**: Crowd control specialist with freezing abilities

#### Tier 1 Skills (Unlock at Level 1)
1. **Frost Aura** (1000 score to unlock)
   - Enemies within range move 20% slower
   - Passive effect, always active
   - *"Chill the air around you"*
   - **Requires defeating 100 enemies**

2. **Ice Shards** (750 score to unlock)
   - Attacks have 25% chance to hit adjacent enemies
   - Splash damage is 50% of main attack
   - *"Shatter ice to strike multiple foes"*
   - **Requires defeating 75 enemies**

#### Tier 2 Skills (Unlock at Level 5)
3. **Freeze Blast** (3000 score to unlock)
   - Active ability: Freezes target enemy for 2 seconds
   - Frozen enemies take +50% damage
   - Cooldown: 20 seconds
   - *"Lock enemies in ice"*
   - **Requires defeating 300 enemies**

4. **Glacial Armor** (2500 score to unlock)
   - Reduces incoming damage by 25% when enemies are nearby
   - Reflects 10% damage back to attackers
   - *"Ice-cold protection"*
   - **Requires defeating 250 enemies**

#### Tier 3 Skills (Unlock at Level 10)
5. **Blizzard** (7500 score to unlock)
   - Ultimate: Creates a blizzard that slows all enemies by 50% for 8 seconds
   - Deals continuous ice damage to all enemies in range
   - Cooldown: 60 seconds
   - *"Unleash the power of winter"*
   - **Requires defeating 750 enemies**

6. **Permafrost** (6000 score to unlock)
   - Ground becomes permanently frozen in attack area
   - Enemies crossing frozen ground are slowed by 40%
   - Effect persists until defender is destroyed
   - *"Leave a lasting mark of ice"*
   - **Requires defeating 600 enemies**

---

### MOYAKI - Fire Magic Warrior
**Theme**: High damage dealer with area-of-effect capabilities

#### Tier 1 Skills (Unlock at Level 1)
1. **Flame Burst** (1500 score to unlock)
   - Attacks create small fire explosions
   - +30% area damage in 1.5 tile radius
   - *"Explosive fire magic"*
   - **Requires defeating 150 enemies**

2. **Heat Wave** (1250 score to unlock)
   - Increases attack speed by 25%
   - Enemies take burn damage over time
   - *"Rapid-fire flame attacks"*
   - **Requires defeating 125 enemies**

#### Tier 2 Skills (Unlock at Level 5)
3. **Inferno Shield** (4000 score to unlock)
   - Creates a fire barrier that damages enemies on contact
   - Barrier lasts 10 seconds, damages for 20% attack power
   - Cooldown: 25 seconds
   - *"Protective flames"*
   - **Requires defeating 400 enemies**

4. **Multi-Strike** (3500 score to unlock)
   - Can target up to 3 enemies simultaneously
   - Each additional target takes 75% damage
   - *"Spread the flames of war"*
   - **Requires defeating 350 enemies**

#### Tier 3 Skills (Unlock at Level 10)
5. **Phoenix Rising** (10000 score to unlock)
   - Ultimate: When destroyed, explodes and resurrects with full health
   - Explosion damages all nearby enemies for 200% attack power
   - Can only trigger once per wave
   - *"Rise from the ashes"*
   - **Requires defeating 1000 enemies**

6. **Meteor Strike** (8000 score to unlock)
   - Calls down meteors that deal massive area damage
   - 3 meteors, each dealing 150% attack power in large radius
   - Cooldown: 45 seconds
   - *"Rain fire from the heavens"*
   - **Requires defeating 800 enemies**

---

### KEON - Universal Defender
**Theme**: Adaptable warrior with tactical abilities

#### Tier 1 Skills (Unlock at Level 1)
1. **Tactical Analysis** (2000 score to unlock)
   - +25% damage against enemy type that appears most frequently in current wave
   - Bonus updates dynamically during wave
   - *"Adapt to the battlefield"*
   - **Requires defeating 200 enemies**

2. **Multi-Strike** (1750 score to unlock)
   - 20% chance to attack twice in rapid succession
   - Second attack deals 60% damage
   - *"Swift consecutive strikes"*
   - **Requires defeating 175 enemies**

#### Tier 2 Skills (Unlock at Level 5)
3. **Battle Stance** (5000 score to unlock)
   - Toggle ability: Choose between Offensive (+40% damage, -20% range) or Defensive (+30% range, -20% damage)
   - Can switch every 10 seconds
   - *"Adapt your fighting style"*
   - **Requires defeating 500 enemies**

4. **Weakness Exploit** (4500 score to unlock)
   - Attacks mark enemies, increasing damage from all sources by 15%
   - Mark lasts 5 seconds, can stack up to 3 times
   - *"Find and exploit enemy vulnerabilities"*
   - **Requires defeating 450 enemies**

#### Tier 3 Skills (Unlock at Level 10)
5. **Master of Arms** (12000 score to unlock)
   - Ultimate: Gains all weapon types for 15 seconds
   - During this time: +100% attack speed, +50% damage, can target any enemy type with maximum effectiveness
   - Cooldown: 90 seconds
   - *"Master of all combat forms"*
   - **Requires defeating 1200 enemies**

6. **Legendary Presence** (10000 score to unlock)
   - All nearby defenders gain +20% attack speed and +15% damage
   - Aura radius: 150 pixels
   - Effect stacks with multiple KEON defenders
   - *"Inspire allies through legendary skill"*
   - **Requires defeating 1000 enemies**

---

## Score-Based Unlock System

### How It Works
- **No Score Payment**: Players keep their accumulated score permanently
- **One-Click Unlock**: If you have enough total score, simply click to unlock the skill
- **Progressive Difficulty**: Higher tier skills require more total score accumulated
- **Persistent Progress**: Score persists across game sessions and waves

### Score Economy (10 points per enemy defeated)
- **Early Game** (Waves 1-5): ~50-100 enemies per wave = 500-1000 score per wave
- **Mid Game** (Waves 6-15): ~75-150 enemies per wave = 750-1500 score per wave  
- **Late Game** (Waves 16+): ~100-200+ enemies per wave = 1000-2000+ score per wave

### Progression Timeline
- **Tier 1 Skills**: Unlockable after 5-10 waves of consistent play
- **Tier 2 Skills**: Unlockable after 15-25 waves (serious commitment)
- **Tier 3 Skills**: Unlockable after 50-100+ waves (endgame content)

### Score Requirements by Defender

#### CHOG (Nature Defender) - Entry Level
- **Tier 1**: 500-750 score (50-75 enemies)
- **Tier 2**: 2000-2500 score (200-250 enemies)  
- **Tier 3**: 4000-5000 score (400-500 enemies)

#### MOLANDAK (Ice Guardian) - Intermediate
- **Tier 1**: 750-1000 score (75-100 enemies)
- **Tier 2**: 2500-3000 score (250-300 enemies)
- **Tier 3**: 6000-7500 score (600-750 enemies)

#### MOYAKI (Fire Mage) - Advanced
- **Tier 1**: 1250-1500 score (125-150 enemies)
- **Tier 2**: 3500-4000 score (350-400 enemies)
- **Tier 3**: 8000-10000 score (800-1000 enemies)

#### KEON (Universal Defender) - Master Level
- **Tier 1**: 1750-2000 score (175-200 enemies)
- **Tier 2**: 4500-5000 score (450-500 enemies)
- **Tier 3**: 10000-12000 score (1000-1200 enemies)

### Level Requirements
- **Tier 1**: Defender must be Level 1+ (placed and active)
- **Tier 2**: Defender must be Level 5+ (survived 5+ waves or killed 100+ enemies)
- **Tier 3**: Defender must be Level 10+ (survived 10+ waves or killed 250+ enemies)

---

## Character Skin Customization

### Available Skins
Each defender can be customized with different character skins found in the defense folder:

#### CHOG Skins
- **Default**: chog_idle.png
- **Jumapel**: jumapel idle.png / jumapel attack.png
- **Noot**: noot idle.png / noot attack.png
- **Wizard**: wizard idle.png / wizard attack.png

#### MOLANDAK Skins  
- **Default**: molandak_idle.png
- **Erkin**: erkin idle.png / erkin attack.png
- **Cannon**: cannon idle.png / cannon attack.png
- **Abster**: abster idle.png / abster attacks.png

#### MOYAKI Skins
- **Default**: moyaki_idle.png
- **Realnads**: realnads idle.png / realnads attack.png
- **Wizard**: wizard idle.png / wizard attack.png
- **Noot**: noot idle.png / noot attack.png

#### KEON Skins
- **Default**: keon_idle.png
- **Skrumpet**: skrumpet idle.png / skrumpet attack.png
- **Abster**: abster idle.png / abster attacks.png
- **Cannon**: cannon idle.png / cannon attack.png

### Skin Unlock Requirements
- **Default Skin**: Always available
- **Alternative Skins**: Unlock with score thresholds
  - **First Alternative**: 100 total score
  - **Second Alternative**: 300 total score  
  - **Third Alternative**: 600 total score

### Skin Selection
- Access skin customization through the skill tree interface
- Preview skins before applying
- Skins are purely cosmetic and don't affect gameplay
- Each defender's skin choice is saved independently

---

## Implementation Features

### Skill Tree UI
- **Visual Tree**: Branching paths showing skill dependencies
- **Score Display**: Show current score and required score for each skill
- **Preview Mode**: Hover to see skill effects before unlocking
- **Unlock Status**: Clear indicators for available, locked, and unlocked skills
- **Skin Selector**: Integrated skin customization panel

### Progression Tracking
- **Defender Experience**: Track individual defender performance
- **Score History**: View score progression over time
- **Unlock Progress**: Visual progress bars for skill unlocks
- **Achievement Integration**: Special unlocks through achievements

### Balance Considerations

#### Economic Balance
- **Score Inflation Prevention**: Higher waves require exponentially more skill combinations to succeed
- **Meaningful Choices**: Players must prioritize which defenders to upgrade first based on their strategy
- **Long-term Engagement**: Tier 3 skills require significant time investment (50-100+ waves)
- **Skill Synergy**: Combining multiple defenders' abilities becomes essential for late-game survival

#### Power Scaling vs Enemy Scaling
- **Defender Growth**: Skills provide 20-50% power increases per tier
- **Enemy Scaling**: Elite enemies and bosses scale faster than basic defender improvements
- **Environmental Pressure**: Hazards and adaptive AI force players to diversify strategies
- **Ultimate Limitations**: Most powerful skills have cooldowns or resource costs to prevent spam

#### Progression Pacing
- **Early Accessibility**: Tier 1 skills unlock within first 10 waves for immediate gratification
- **Mid-game Depth**: Tier 2 skills require strategic wave management and defender positioning
- **Endgame Mastery**: Tier 3 skills demand perfect execution and multi-defender coordination
- **Skill Gating**: Level requirements ensure players learn basic mechanics before accessing advanced abilities

#### Counter-Play Mechanics
- **Adaptive Enemies**: AI learns from player strategies and spawns appropriate counters
- **Elite Resistances**: High-tier enemies resist specific damage types and effects
- **Boss Immunities**: Major bosses require diverse strategies and cannot be defeated with single approaches
- **Environmental Challenges**: Hazards force players to adapt positioning and timing

#### Reward Structure
- **Immediate Feedback**: Each enemy defeat provides visible score progress
- **Milestone Rewards**: Unlocking new skills provides significant power spikes
- **Customization Options**: Skin unlocks provide visual progression alongside mechanical upgrades
- **Mastery Recognition**: High score thresholds demonstrate player dedication and skill

---

## Strategic Depth

### Build Archetypes

#### CHOG Builds
- **Bird Hunter**: Focus on Wind Gust + Sharp Eyes + Nature's Wrath
- **Area Controller**: Thorn Barrier + Poison Spores + Dual Target

#### MOLANDAK Builds  
- **Crowd Control**: Frost Aura + Freeze Blast + Blizzard
- **Tank**: Glacial Armor + Permafrost + Ice Shards

#### MOYAKI Builds
- **Glass Cannon**: Flame Burst + Heat Wave + Dragon's Breath
- **Kamikaze**: Inferno Shield + Molten Projectiles + Phoenix Rising

#### KEON Builds
- **Support**: Legendary Presence + Weakness Exploit + Battle Stance
- **Solo Carry**: Master of Arms + Multi-Strike + Tactical Analysis

### Synergy Examples
- **MOLANDAK + MOYAKI**: Ice slows enemies for fire AOE damage
- **CHOG + KEON**: Nature crowd control + tactical damage bonuses
- **Multiple KEON**: Stacking aura effects for team-wide bonuses

This skill tree system adds significant depth while maintaining the core tower defense gameplay, giving players meaningful choices and long-term progression goals.