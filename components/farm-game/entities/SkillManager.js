'use client';

export default class SkillManager {
  constructor() {
    this.activeSkills = new Map(); // Map of skillId -> skill data
    this.skillEffects = new Map(); // Map of skillId -> effect function
    this.defenderSkills = new Map(); // Map of defenderId -> Set of active skills
    
    this.initializeSkillEffects();
  }

  initializeSkillEffects() {
    // CHOG Skills
    this.skillEffects.set('chog_rapid_fire', {
      name: 'Rapid Fire',
      description: 'Reduces attack cooldown by 30%',
      apply: (defender) => {
        defender.cooldown *= 0.7;
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.rapidFire = true;
      },
      remove: (defender) => {
        if (defender.skillEffects?.rapidFire) {
          defender.cooldown /= 0.7;
          delete defender.skillEffects.rapidFire;
        }
      }
    });

    this.skillEffects.set('chog_mana_efficiency', {
      name: 'Mana Efficiency',
      description: 'Reduces mana cost per shot by 40%',
      apply: (defender) => {
        defender.manaCostPerShot *= 0.6;
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.manaEfficiency = true;
      },
      remove: (defender) => {
        if (defender.skillEffects?.manaEfficiency) {
          defender.manaCostPerShot /= 0.6;
          delete defender.skillEffects.manaEfficiency;
        }
      }
    });

    this.skillEffects.set('chog_enhanced_range', {
      name: 'Enhanced Range',
      description: 'Increases attack range by 25%',
      apply: (defender) => {
        defender.range *= 1.25;
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.enhancedRange = true;
      },
      remove: (defender) => {
        if (defender.skillEffects?.enhancedRange) {
          defender.range /= 1.25;
          delete defender.skillEffects.enhancedRange;
        }
      }
    });

    this.skillEffects.set('chog_piercing_shot', {
      name: 'Piercing Shot',
      description: 'Projectiles pierce through enemies',
      apply: (defender) => {
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.piercingShot = true;
      },
      remove: (defender) => {
        if (defender.skillEffects?.piercingShot) {
          delete defender.skillEffects.piercingShot;
        }
      }
    });

    // MOLANDAK Skills
    this.skillEffects.set('molandak_frost_aura', {
      name: 'Frost Aura',
      description: 'Slows enemies within range by 30%',
      apply: (defender) => {
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.frostAura = true;
        defender.auraRadius = 120;
        defender.slowEffect = 0.7;
      },
      remove: (defender) => {
        if (defender.skillEffects?.frostAura) {
          delete defender.skillEffects.frostAura;
          delete defender.auraRadius;
          delete defender.slowEffect;
        }
      }
    });

    this.skillEffects.set('molandak_ice_shards', {
      name: 'Ice Shards',
      description: 'Attacks create ice shards that deal AOE damage',
      apply: (defender) => {
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.iceShards = true;
        defender.aoeRadius *= 1.5;
        defender.aoeDamageMultiplier *= 1.3;
      },
      remove: (defender) => {
        if (defender.skillEffects?.iceShards) {
          defender.aoeRadius /= 1.5;
          defender.aoeDamageMultiplier /= 1.3;
          delete defender.skillEffects.iceShards;
        }
      }
    });

    this.skillEffects.set('molandak_frozen_ground', {
      name: 'Frozen Ground',
      description: 'Creates frozen patches that slow enemies',
      apply: (defender) => {
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.frozenGround = true;
      },
      remove: (defender) => {
        if (defender.skillEffects?.frozenGround) {
          delete defender.skillEffects.frozenGround;
        }
      }
    });

    this.skillEffects.set('molandak_blizzard', {
      name: 'Blizzard',
      description: 'Special attack creates a massive blizzard',
      apply: (defender) => {
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.blizzard = true;
        defender.specialAttackDamageMultiplier *= 1.5;
      },
      remove: (defender) => {
        if (defender.skillEffects?.blizzard) {
          defender.specialAttackDamageMultiplier /= 1.5;
          delete defender.skillEffects.blizzard;
        }
      }
    });

    // MOYAKI Skills
    this.skillEffects.set('moyaki_flame_burst', {
      name: 'Flame Burst',
      description: 'Increases AOE damage by 50%',
      apply: (defender) => {
        defender.aoeDamageMultiplier *= 1.5;
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.flameBurst = true;
      },
      remove: (defender) => {
        if (defender.skillEffects?.flameBurst) {
          defender.aoeDamageMultiplier /= 1.5;
          delete defender.skillEffects.flameBurst;
        }
      }
    });

    this.skillEffects.set('moyaki_burning_trail', {
      name: 'Burning Trail',
      description: 'Projectiles leave burning trails',
      apply: (defender) => {
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.burningTrail = true;
      },
      remove: (defender) => {
        if (defender.skillEffects?.burningTrail) {
          delete defender.skillEffects.burningTrail;
        }
      }
    });

    this.skillEffects.set('moyaki_molten_core', {
      name: 'Molten Core',
      description: 'Increases damage by 40% and adds burn effect',
      apply: (defender) => {
        defender.damage *= 1.4;
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.moltenCore = true;
      },
      remove: (defender) => {
        if (defender.skillEffects?.moltenCore) {
          defender.damage /= 1.4;
          delete defender.skillEffects.moltenCore;
        }
      }
    });

    this.skillEffects.set('moyaki_inferno', {
      name: 'Inferno',
      description: 'Special attack creates a massive inferno',
      apply: (defender) => {
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.inferno = true;
        defender.specialAttackDamageMultiplier *= 2.0;
        defender.aoeRadius *= 1.8;
      },
      remove: (defender) => {
        if (defender.skillEffects?.inferno) {
          defender.specialAttackDamageMultiplier /= 2.0;
          defender.aoeRadius /= 1.8;
          delete defender.skillEffects.inferno;
        }
      }
    });

    // KEON Skills
    this.skillEffects.set('keon_divine_blessing', {
      name: 'Divine Blessing',
      description: 'Increases damage by 30% and mana regeneration by 50%',
      apply: (defender) => {
        defender.damage *= 1.3;
        defender.manaRegenRate *= 1.5;
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.divineBlessing = true;
      },
      remove: (defender) => {
        if (defender.skillEffects?.divineBlessing) {
          defender.damage /= 1.3;
          defender.manaRegenRate /= 1.5;
          delete defender.skillEffects.divineBlessing;
        }
      }
    });

    this.skillEffects.set('keon_holy_aura', {
      name: 'Holy Aura',
      description: 'Provides protective aura that boosts nearby defenders',
      apply: (defender) => {
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.holyAura = true;
        defender.auraRadius = 150;
        defender.auraBoost = 1.2;
      },
      remove: (defender) => {
        if (defender.skillEffects?.holyAura) {
          delete defender.skillEffects.holyAura;
          delete defender.auraRadius;
          delete defender.auraBoost;
        }
      }
    });

    this.skillEffects.set('keon_purification', {
      name: 'Purification',
      description: 'Attacks deal extra damage to undead enemies',
      apply: (defender) => {
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.purification = true;
        defender.undeadDamageMultiplier = 2.0;
      },
      remove: (defender) => {
        if (defender.skillEffects?.purification) {
          delete defender.skillEffects.purification;
          delete defender.undeadDamageMultiplier;
        }
      }
    });

    this.skillEffects.set('keon_divine_wrath', {
      name: 'Divine Wrath',
      description: 'Special attack calls down divine lightning',
      apply: (defender) => {
        defender.skillEffects = defender.skillEffects || {};
        defender.skillEffects.divineWrath = true;
        defender.specialAttackDamageMultiplier *= 2.5;
      },
      remove: (defender) => {
        if (defender.skillEffects?.divineWrath) {
          defender.specialAttackDamageMultiplier /= 2.5;
          delete defender.skillEffects.divineWrath;
        }
      }
    });
  }

  // Apply a skill to a defender
  applySkill(defenderId, skillId) {
    const defender = this.getDefenderById(defenderId);
    if (!defender) return false;

    const skillEffect = this.skillEffects.get(skillId);
    if (!skillEffect) return false;

    // Check if skill is already applied
    if (!this.defenderSkills.has(defenderId)) {
      this.defenderSkills.set(defenderId, new Set());
    }

    const defenderSkillSet = this.defenderSkills.get(defenderId);
    if (defenderSkillSet.has(skillId)) {
      return false; // Skill already applied
    }

    // Apply the skill effect
    skillEffect.apply(defender);
    defenderSkillSet.add(skillId);

    // Store skill data
    this.activeSkills.set(skillId, {
      defenderId,
      skillId,
      appliedAt: Date.now()
    });

    return true;
  }

  // Remove a skill from a defender
  removeSkill(defenderId, skillId) {
    const defender = this.getDefenderById(defenderId);
    if (!defender) return false;

    const skillEffect = this.skillEffects.get(skillId);
    if (!skillEffect) return false;

    const defenderSkillSet = this.defenderSkills.get(defenderId);
    if (!defenderSkillSet || !defenderSkillSet.has(skillId)) {
      return false; // Skill not applied
    }

    // Remove the skill effect
    skillEffect.remove(defender);
    defenderSkillSet.delete(skillId);

    // Remove skill data
    this.activeSkills.delete(skillId);

    return true;
  }

  // Get all active skills for a defender
  getDefenderSkills(defenderId) {
    return this.defenderSkills.get(defenderId) || new Set();
  }

  // Check if a defender has a specific skill
  hasSkill(defenderId, skillId) {
    const defenderSkillSet = this.defenderSkills.get(defenderId);
    return defenderSkillSet ? defenderSkillSet.has(skillId) : false;
  }

  // Apply all unlocked skills to a defender based on skill tree progress
  applyUnlockedSkills(defender, unlockedSkills) {
    if (!defender || !unlockedSkills) return;

    const defenderId = defender.id || `${defender.type}_${defender.x}_${defender.y}`;
    
    // Apply each unlocked skill
    unlockedSkills.forEach(skillId => {
      this.applySkill(defenderId, skillId);
    });
  }

  // Get defender by ID (helper method)
  getDefenderById(defenderId) {
    // This would need to be implemented based on how defenders are stored
    // For now, we'll assume the game scene provides this functionality
    if (window.gameScene && window.gameScene.defenses) {
      return window.gameScene.defenses.find(defense => {
        const id = defense.id || `${defense.type}_${defense.x}_${defense.y}`;
        return id === defenderId;
      });
    }
    return null;
  }

  // Update skill effects (called each frame)
  update(delta) {
    // Handle time-based skill effects here if needed
    // For example, periodic damage, temporary buffs, etc.
  }

  // Get skill effect description
  getSkillDescription(skillId) {
    const skillEffect = this.skillEffects.get(skillId);
    return skillEffect ? skillEffect.description : 'Unknown skill';
  }

  // Get all available skills for a defender type
  getAvailableSkills(defenderType) {
    const skillsByType = {
      'chog': ['chog_rapid_fire', 'chog_mana_efficiency', 'chog_enhanced_range', 'chog_piercing_shot'],
      'molandak': ['molandak_frost_aura', 'molandak_ice_shards', 'molandak_frozen_ground', 'molandak_blizzard'],
      'moyaki': ['moyaki_flame_burst', 'moyaki_burning_trail', 'moyaki_molten_core', 'moyaki_inferno'],
      'keon': ['keon_divine_blessing', 'keon_holy_aura', 'keon_purification', 'keon_divine_wrath']
    };

    return skillsByType[defenderType] || [];
  }

  // Clear all skills from a defender (useful when defender is destroyed)
  clearDefenderSkills(defenderId) {
    const defenderSkillSet = this.defenderSkills.get(defenderId);
    if (defenderSkillSet) {
      defenderSkillSet.forEach(skillId => {
        this.removeSkill(defenderId, skillId);
      });
      this.defenderSkills.delete(defenderId);
    }
  }
}