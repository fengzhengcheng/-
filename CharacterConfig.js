/**
 * CharacterConfig.js - 角色配置模块
 * 定义可玩角色的属性、技能、外观配置 + 素材路径
 */
class CharacterConfig {
    static getAll() {
        return [this.chifeng, this.qinglan, this.tiekui];
    }

    static getById(id) {
        return this.getAll().find(c => c.id === id) || this.chifeng;
    }

    // ========== 赤锋 — 平衡型近战主角 ==========
    static get chifeng() {
        return {
            id: 'chifeng',
            name: '赤锋',
            title: '平衡型近战',
            description: '攻防均衡，适合新手',
            maxHp: 120,
            maxEp: 100,
            moveSpeed: 3.5,
            attackSpeed: 1.0,
            normalDamage: [10, 12, 18],
            heavyDamage: 22,
            skillDamage: 28,
            skillCost: 0,
            skillType: 'laser_eye',
            skillName: '激光眼',
            skillDesc: '长按L持续发射激光，全图锁定最近目标',
            knockback: [5, 6, 12],
            heavyKnockback: 10,
            skillKnockback: 14,
            attackRange: [58, 58, 75],
            heavyRange: 90,
            skillRange: 95,
            laserRange: 99999,
            laserLockYRange: 99999,
            laserDamagePerTick: 6,
            laserTickInterval: 120,
            laserBossDamageMultiplier: 0.5,
            laserEnemyKnockback: 2.6,
            laserBossKnockback: 4.2,
            laserEnergyCostPerSecond: 20,
            laserCooldown: 3000,
            laserMaxDuration: 5000,
            laserPreheatLength: 72,
            charType: 'chifeng',
            // 素材路径
            spriteIdle: 'assets/sprites/players/chifeng/idle.png',
            skillPoseImage: 'assets/sprites/players/chifeng/skill_pose.png',
            laserImage: 'assets/effects/laser_beam.png',
            // 多帧动作图片
            spriteFrames: {
                idle: [
                    'assets/sprites/players/chifeng/idle_01.png',
                    'assets/sprites/players/chifeng/idle_02.png',
                ],
                walk: [
                    'assets/sprites/players/chifeng/walk_01.png',
                    'assets/sprites/players/chifeng/walk_02.png',
                    'assets/sprites/players/chifeng/walk_03.png',
                    'assets/sprites/players/chifeng/walk_04.png',
                ],
                attack: ['assets/sprites/players/chifeng/attack_01.png'],
                heavy: ['assets/sprites/players/chifeng/attack_02.png'],
                hurt: ['assets/sprites/players/chifeng/hurt.png'],
                dead: ['assets/sprites/players/chifeng/down.png'],
            },
            colorConfig: {
                headRadius: 12, bodyWidth: 26, bodyHeight: 32, armLength: 20, legLength: 24,
                skinColor: '#ffcc99', hairColor: '#222222',
                shirtColor: '#2244aa', shirtDetail: '#113399',
                pantsColor: '#1a1a33', shoeColor: '#333344',
                trailColor: '#ff8844', trailWidth: 2.5, heavyTrailColor: '#ff4400'
            }
        };
    }

    // ========== 青岚 — 敏捷型近战角色 ==========
    static get qinglan() {
        return {
            id: 'qinglan',
            name: '青岚',
            title: '敏捷型近战',
            description: '高速连击，灵活多变',
            maxHp: 90,
            maxEp: 110,
            moveSpeed: 4.8,
            attackSpeed: 0.75,          // 攻击更快
            normalDamage: [7, 9, 14],   // 较低伤害
            heavyDamage: 16,
            skillDamage: 20,
            skillCost: 18,
            skillType: 'dashKick',      // 闪光突进
            skillName: '闪光突进',
            skillDesc: '短距离高速突进，多段命中，适合连击',
            knockback: [3, 4, 7],
            heavyKnockback: 5,
            skillKnockback: 9,
            attackRange: [52, 52, 65],
            heavyRange: 60,
            skillRange: 130,             // 突进距离较长
            charType: 'qinglan',
            // 素材路径
            spriteIdle: 'assets/sprites/players/qinglan/idle.png',
            colorConfig: {
                headRadius: 10, bodyWidth: 18, bodyHeight: 24, armLength: 16, legLength: 26,
                skinColor: '#eeddbb', hairColor: '#114488',
                shirtColor: '#115566', shirtDetail: '#0a4455',
                pantsColor: '#1a222a', shoeColor: '#223344',
                trailColor: '#44ddff', trailWidth: 1.5, heavyTrailColor: '#00ccff'
            }
        };
    }

    // ========== 铁魁 — 重型力量角色 ==========
    static get tiekui() {
        return {
            id: 'tiekui',
            name: '铁魁',
            title: '重型力量型',
            description: '高血高伤，正面碾压',
            maxHp: 150,
            maxEp: 80,
            moveSpeed: 2.7,               // 最慢
            attackSpeed: 1.25,           // 最慢但最重
            normalDamage: [14, 18, 26],   // 高伤害
            heavyDamage: 35,             // 最高
            skillDamage: 40,             // 最高
            skillCost: 28,
            skillType: 'groundPound',    // 震地重拳
            skillName: '震地重拳',
            skillDesc: '向前猛冲并重拳砸地，造成高伤害与明显击退，适合压制敌人',
            knockback: [8, 10, 16],      // 击退最强
            heavyKnockback: 15,
            skillKnockback: 20,          // 震地击退极强
            attackRange: [62, 62, 80],   // 攻击范围略大
            heavyRange: 78,
            skillRange: 90,
            charType: 'tiekui',
            // 素材路径
            spriteIdle: 'assets/sprites/players/tiekui/idle.png',
            colorConfig: {
                headRadius: 16, bodyWidth: 36, bodyHeight: 40, armLength: 26, legLength: 20,
                skinColor: '#cc9966', hairColor: '#221100',
                shirtColor: '#883322', shirtDetail: '#aa4422',
                pantsColor: '#2a2218', shoeColor: '#332211',
                trailColor: '#ff6633', trailWidth: 3.5, heavyTrailColor: '#ff3300'
            }
        };
    }

    // ========== 以下为保留的旧角色（备用） ==========
    static get along() {
        return {
            id: 'along', name: '阿龙', title: '均衡型', description: '攻守兼备，适合新手',
            maxHp: 100, maxEp: 100, moveSpeed: 3.5, attackSpeed: 1.0,
            normalDamage: [8, 10, 15], heavyDamage: 18, skillDamage: 25, skillCost: 20,
            skillType: 'energySlash', skillName: '能量斩', skillDesc: '向前释放短距离冲击波',
            knockback: [4, 5, 10], heavyKnockback: 8, skillKnockback: 12,
            attackRange: [55, 55, 70], heavyRange: 65, skillRange: 90,
            charType: 'along', spriteIdle: null,
            colorConfig: { headRadius:11,bodyWidth:22,bodyHeight:28,armLength:18,legLength:22,
                skinColor:'#ffcc99',hairColor:'#332211',shirtColor:'#3366cc',shirtDetail:'#2255aa',
                pantsColor:'#2a2a44',shoeColor:'#443322',trailColor:'#aaddff',trailWidth:2,heavyTrailColor:'#ffaa00' }
        };
    }

    static get xiaoying() {
        return { id:'xiaoying',name:'小影',title:'速度型',description:'身法灵活，连击高手',
            maxHp:80,maxEp:120,moveSpeed:4.5,attackSpeed:0.8,normalDamage:[6,8,12],heavyDamage:14,
            skillDamage:18,skillCost:18,skillType:'dashKick',skillName:'疾风踢',skillDesc:'快速突进并踢击敌人',
            knockback:[3,4,8],heavyKnockback:6,skillKnockback:8,
            attackRange:[50,50,65],heavyRange:58,skillRange:120,charType:'xiaoying',spriteIdle:null,
            colorConfig:{headRadius:9,bodyWidth:14,bodyHeight:20,armLength:14,legLength:24,
                skinColor:'#eeddbb',hairColor:'#553388',shirtColor:'#6633aa',shirtDetail:'#8844cc',
                pantsColor:'#2a2233',shoeColor:'#332244',trailColor:'#cc88ff',trailWidth:1.5,heavyTrailColor:'#aa66ff' } };
    }

    static get tieshan() {
        return { id:'tieshan',name:'铁山',title:'力量型',description:'重拳出击，势不可挡',
            maxHp:130,maxEp:80,moveSpeed:2.8,attackSpeed:1.3,normalDamage:[12,15,22],heavyDamage:28,
            skillDamage:35,skillCost:25,skillType:'groundPound',skillName:'震地拳',skillDesc:'砸地造成范围伤害',
            knockback:[6,8,14],heavyKnockback:12,skillKnockback:15,
            attackRange:[60,60,75],heavyRange:72,skillRange:100,charType:'tieshan',spriteIdle:null,
            colorConfig:{headRadius:15,bodyWidth:34,bodyHeight:38,armLength:24,legLength:20,
                skinColor:'#cc9966',hairColor:'#221100',shirtColor:'#883322',shirtDetail:'#aa4422',
                pantsColor:'#2a2218',shoeColor:'#332211',trailColor:'#ffaa44',trailWidth:3,heavyTrailColor:'#ff6633' } };
    }
}
