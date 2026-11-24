/**
 * Vintage Photo Booth - Curated Pose Inspiration Library
 * 
 * High-quality photographic reference library and coaching tips.
 * Visual design system: Vintage Photography Catalogue aesthetic
 * Palette: Burgundy (#3a1219, #541723), Warm Cream (#fdfbf7, #f7f1e5), Mustard Gold (#d4972e, #fab839).
 */

import soloGlance from '../assets/poses/solo/solo_glance.jpg';
import soloTiltedPortrait from '../assets/poses/solo/solo_tilted_portrait.jpg';
import soloWinkLipBite from '../assets/poses/solo/solo_wink_lip_bite.jpg';
import soloClassicSmile from '../assets/poses/solo/solo_classic_smile.jpg';
import soloChinRestPout from '../assets/poses/solo/solo_chin_rest_pout.jpg';
import soloRadiantLaugh from '../assets/poses/solo/solo_radiant_laugh.jpg';
import soloBlownKiss from '../assets/poses/solo/solo_blown_kiss.jpg';
import coupleCheekKiss from '../assets/poses/couples/couple_cheek_kiss.jpg';
import coupleGuessWho from '../assets/poses/couples/couple_guess_who.jpg';
import coupleCloseCuddle from '../assets/poses/couples/couple_close_cuddle.jpg';
import coupleTongueOut from '../assets/poses/couples/couple_tongue_out.jpg';
import coupleFaceCradle from '../assets/poses/couples/couple_face_cradle.jpg';
import couplePlayfulBite from '../assets/poses/couples/couple_playful_bite.jpg';
import coupleWarmEmbrace from '../assets/poses/couples/couple_warm_embrace.jpg';
import groupBestiesHug from '../assets/poses/groups/group_besties_hug.jpg';
import groupKissAndPout from '../assets/poses/groups/group_kiss_and_pout.jpg';
import groupGoofyTongues from '../assets/poses/groups/group_goofy_tongues.jpg';
import groupRetroKisses from '../assets/poses/groups/group_retro_kisses.jpg';
import groupFingerPointPout from '../assets/poses/groups/group_finger_point_pout.jpg';
import groupSpillTheTea from '../assets/poses/groups/group_spill_the_tea.jpg';
import groupCharliesAngels from '../assets/poses/groups/group_charlies_angels.jpg';

export const POSE_CATEGORIES = [
  { id: 'solo', name: 'SOLO', label: 'Solo Portraits', icon: '👤', description: 'Single-person classics, film-star glamour, and playful retro poses' },
  { id: 'couples', name: 'COUPLES', label: 'Couples & Duos', icon: '👥', description: 'Romantic moments, stylish back-to-back poses, and playful duos' },
  { id: 'groups', name: 'FRIENDS', label: 'Friends', icon: '🎉', description: 'High-energy squad frames, creative pyramids, and laugh-out-loud chaos' }
];

export const POSE_VIBES = [
  { id: 'all', label: 'ALL VIBES' },
  { id: 'classic', label: 'CLASSIC & GLAMOUR' },
  { id: 'playful', label: 'PLAYFUL & CUTE' },
  { id: 'candid', label: 'CANDID & LAUGH' },
  { id: 'creative', label: 'CREATIVE & DYNAMIC' }
];

export const POSE_LIBRARY = [
  // ==================== SOLO POSES (7 PHOTOGRAPHIC REFERENCES) ====================
  {
    id: 'solo_glance',
    category: 'solo',
    title: 'The Over-the-Shoulder Glance',
    vibe: 'playful',
    vibeLabel: 'Playful & Cute',
    image: soloGlance,
    tagline: 'Dimpled charm with a soft upward gaze',
    instruction: 'Turn your torso slightly away, glance back over your shoulder with a relaxed, dimpled smile, and look gently upwards.',
    proTip: 'Keep your neck elongated and let your smile reach your eyes for natural vintage warmth.'
  },
  {
    id: 'solo_tilted_portrait',
    category: 'solo',
    title: 'The Confident Head Tilt',
    vibe: 'classic',
    vibeLabel: 'Classic & Glamour',
    image: soloTiltedPortrait,
    tagline: 'Bold, direct, and effortlessly striking',
    instruction: 'Tilt your head toward your shoulder, rest your gaze directly into the lens, and hold a subtle, knowing smirk.',
    proTip: 'Relax your shoulders down so your earrings or collar catch the photobooth key light.'
  },
  {
    id: 'solo_wink_lip_bite',
    category: 'solo',
    title: 'The Playful Wink & Smile',
    vibe: 'playful',
    vibeLabel: 'Playful & Cute',
    image: soloWinkLipBite,
    tagline: 'Spontaneous, cheeky photobooth joy',
    instruction: 'Wink one eye tight, bring your index finger gently to your bottom lip, and flash a bright, candid toothy grin.',
    proTip: 'Don’t overthink the wink—laugh right as the shutter clicks to capture authentic happiness.'
  },
  {
    id: 'solo_classic_smile',
    category: 'solo',
    title: 'The Vintage Booth Classic',
    vibe: 'classic',
    vibeLabel: 'Classic & Glamour',
    image: soloClassicSmile,
    tagline: 'Soft, timeless, and naturally elegant',
    instruction: 'Sit square to the lens, tilt your head slightly, and offer a calm, natural smile with soft eyes.',
    proTip: 'Breathe out gently right before the flash to soften your expression and keep it effortlessly candid.'
  },
  {
    id: 'solo_chin_rest_pout',
    category: 'solo',
    title: 'The Dreamer’s Pout',
    vibe: 'creative',
    vibeLabel: 'Creative & Dynamic',
    image: soloChinRestPout,
    tagline: 'Reflective cinema glamour with hand to chin',
    instruction: 'Cup your fingertips lightly under your jawline, look dreamily up toward the booth light, and soften your lips into a gentle pout.',
    proTip: 'Rest your hand feather-light against your cheek to avoid pressing or distorting your skin.'
  },
  {
    id: 'solo_radiant_laugh',
    category: 'solo',
    title: 'The Radiant Chin Rest',
    vibe: 'candid',
    vibeLabel: 'Candid & Laugh',
    image: soloRadiantLaugh,
    tagline: 'Beaming warmth and infectious laughter',
    instruction: 'Rest your chin on the back of your hand, angle your face upward, and let out a full, joyful, genuine laugh.',
    proTip: 'Think of your funniest memory right before the countdown reaches zero for an authentic radiant glow.'
  },
  {
    id: 'solo_blown_kiss',
    category: 'solo',
    title: 'The Vintage Blown Kiss',
    vibe: 'playful',
    vibeLabel: 'Playful & Cute',
    image: soloBlownKiss,
    tagline: 'Playful romance sent straight to the camera',
    instruction: 'Raise one hand flat beneath your lips, purse your lips into a kiss, and blow a romantic keepsake kiss directly into the lens.',
    proTip: 'Hold the hand pose steady just below your chin so it doesn’t block the photobooth flash on your face.'
  },

  // ==================== COUPLES POSES (7 PHOTOGRAPHIC REFERENCES) ====================
  {
    id: 'couple_close_cuddle',
    category: 'couples',
    title: 'The Classic Booth Cuddle',
    vibe: 'classic',
    vibeLabel: 'Classic & Glamour',
    image: coupleCloseCuddle,
    tagline: 'Side-by-side intimacy and bright, genuine smiles',
    instruction: 'Sit closely together shoulder-to-shoulder, lean your heads in until your temples gently touch, and smile warmly right into the camera.',
    proTip: 'Tilt your heads slightly toward each other at complementary angles to create a harmonious silhouette.'
  },
  {
    id: 'couple_guess_who',
    category: 'couples',
    title: 'The \'Guess Who?\' Surprise',
    vibe: 'playful',
    vibeLabel: 'Playful & Cute',
    image: coupleGuessWho,
    tagline: 'Playful hands covering eyes with contagious laughter',
    instruction: 'Partner 1 stands slightly behind or beside Partner 2 and gently covers their eyes with both hands. Partner 2 flashes a big, laughing smile.',
    proTip: 'Rest hands lightly over the brow so you don’t block Partner 2’s laughing smile or press into their face.'
  },
  {
    id: 'couple_cheek_kiss',
    category: 'couples',
    title: 'The Sweet Cheek Kiss',
    vibe: 'romantic',
    vibeLabel: 'Romantic',
    image: coupleCheekKiss,
    tagline: 'Tender romance with an affectionate kiss on the cheek',
    instruction: 'Partner 1 turns and places a gentle, sweet kiss on Partner 2’s cheek. Partner 2 faces the lens directly with a relaxed, happy smile.',
    proTip: 'Partner 1, keep your eyes closed during the kiss for genuine warmth; Partner 2, keep your shoulders square to the camera.'
  },
  {
    id: 'couple_face_cradle',
    category: 'couples',
    title: 'The Tender Face Cradle',
    vibe: 'creative',
    vibeLabel: 'Creative & Dynamic',
    image: coupleFaceCradle,
    tagline: 'Intimate cinematic close-up with foreheads gently touching',
    instruction: 'Partner 1 cups Partner 2’s jawline with both hands. Bring your foreheads and noses close together, close your eyes, and share a quiet, tender smile.',
    proTip: 'Keep your hands soft and let your fingers curl naturally along the cheekbone for romantic cinematic framing.'
  },
  {
    id: 'couple_tongue_out',
    category: 'couples',
    title: 'The Cheeky Tongue-Out',
    vibe: 'playful',
    vibeLabel: 'Playful & Cute',
    image: coupleTongueOut,
    tagline: 'Rebellious retro charm and carefree goofy energy',
    instruction: 'Lean in close together in the center of the frame and stick your tongues out playfully right as the shutter clicks.',
    proTip: 'Coordinate with a quick countdown so both of you strike the goofy expression at the exact same split-second.'
  },
  {
    id: 'couple_playful_bite',
    category: 'couples',
    title: 'The Playful Cheek Nibble',
    vibe: 'candid',
    vibeLabel: 'Candid & Laugh',
    image: couplePlayfulBite,
    tagline: 'Unfiltered laughter and affectionate teasing',
    instruction: 'Partner 1 leans in and playfully pretend-nibbles Partner 2’s cheek while Partner 2 lets out a full, joyful, spontaneous laugh.',
    proTip: 'Partner 2, don’t hold back—the bigger and more natural your laugh, the more heartwarming the photobooth shot.'
  },
  {
    id: 'couple_warm_embrace',
    category: 'couples',
    title: 'The Bear Hug Embrace',
    vibe: 'candid',
    vibeLabel: 'Candid & Laugh',
    image: coupleWarmEmbrace,
    tagline: 'Tight, heartfelt squeeze full of warmth and laughter',
    instruction: 'Wrap your arms tightly around each other in a warm embrace, nuzzle your cheek into your partner’s neck, and laugh together into the lens.',
    proTip: 'Squeeze in close so both of your faces stay framed in the center of the lens without cutting off your hug.'
  },

  // ==================== FRIENDS & GROUPS POSES (7 PHOTOGRAPHIC REFERENCES) ====================
  {
    id: 'group_besties_hug',
    category: 'groups',
    title: 'The Day-One Besties',
    vibe: 'classic',
    vibeLabel: 'Classic & Glamour',
    image: groupBestiesHug,
    tagline: 'Timeless photobooth warmth with heads close together',
    instruction: 'Wrap your arms around each other’s shoulders or waist, lean your heads in together, and beam your biggest genuine smiles right at the lens.',
    proTip: 'Keep your shoulders angled slightly inward toward each other to create a cozy, balanced duo frame.'
  },
  {
    id: 'group_kiss_and_pout',
    category: 'groups',
    title: 'The Sweet Pout & Wink',
    vibe: 'playful',
    vibeLabel: 'Playful & Cute',
    image: groupKissAndPout,
    tagline: 'Adorable photobooth sweetness with eyes closed and sweet smiles',
    instruction: 'Lean in close temple-to-temple with soft closed-eye smiles. Friend 1 rests fingertips under the chin while Friend 2 puckers a cute kiss.',
    proTip: 'Close your eyes gently without scrunching so your lashes and joyful expressions stay soft and photogenic.'
  },
  {
    id: 'group_goofy_tongues',
    category: 'groups',
    title: 'The Goofy Tongue-Out',
    vibe: 'playful',
    vibeLabel: 'Playful & Cute',
    image: groupGoofyTongues,
    tagline: 'Rebellious retro fun and carefree laughter',
    instruction: 'Wrap both arms tightly around each other in an embrace, lean in close, and playfully stick your tongues out right as the shutter clicks.',
    proTip: 'Don’t hold back the silly faces—the more unapologetically goofy you both are, the more memorable the strip.'
  },
  {
    id: 'group_retro_kisses',
    category: 'groups',
    title: 'The Retro Kiss Blowers',
    vibe: 'creative',
    vibeLabel: 'Creative & Dynamic',
    image: groupRetroKisses,
    tagline: 'Chic vintage glam with dual blown kisses and retro frames',
    instruction: 'Pose cheek-to-cheek facing the camera. Both friends purse lips into stylish vintage kisses, one resting a manicured hand near their collar.',
    proTip: 'Keep your chins slightly lifted toward the booth light to accentuate your cheekbones.'
  },
  {
    id: 'group_finger_point_pout',
    category: 'groups',
    title: 'The Mirrored \'Hush & Pout\'',
    vibe: 'creative',
    vibeLabel: 'Creative & Dynamic',
    image: groupFingerPointPout,
    tagline: 'Quirky matching poses with dramatic pouty expressions',
    instruction: 'Mirror each other side-by-side: place one index finger straight up against your chin or lip, furrow your brows playfully, and pout at the lens.',
    proTip: 'Keep a deadpan, mock-serious face to sell the high-fashion editorial humor.'
  },
  {
    id: 'group_spill_the_tea',
    category: 'groups',
    title: 'The \'Spill the Tea!\' Shock',
    vibe: 'candid',
    vibeLabel: 'Candid & Laugh',
    image: groupSpillTheTea,
    tagline: 'The ultimate gossip whisper and dramatic jaw-drop gasp',
    instruction: 'Friend 1 cups a hand and whispers a juicy secret into Friend 2’s ear. Friend 2 drops their jaw and widens their eyes in total shock!',
    proTip: 'Tell a genuinely hilarious secret so Friend 2’s jaw-drop reaction turns into real, contagious laughter.'
  },
  {
    id: 'group_charlies_angels',
    category: 'groups',
    title: 'The Charlie’s Angels Guns',
    vibe: 'creative',
    vibeLabel: 'Creative & Dynamic',
    image: groupCharliesAngels,
    tagline: 'Iconic back-to-back 70s action movie finger guns',
    instruction: 'Stand back-to-back, look out toward the camera, and raise double finger guns beside your cheeks with confident attitudes.',
    proTip: 'Press your shoulder blades together so you stay firmly anchored in the center of the frame.'
  }
];

// ==================== 3 COMPLETE FOUR-SHOT CHALLENGES ====================
export const FOUR_SHOT_CHALLENGES = [
  {
    id: 'challenge_solo_star',
    category: 'solo',
    title: 'The Golden Age Film Star',
    subtitle: 'Classic 4-Shot Hollywood Storyline',
    description: 'A cinematic progression evolving from a mysterious portrait into an unforgettable, radiant smile.',
    shots: [
      { step: 1, poseId: 'solo_classic_smile', title: 'The Vintage Classic', cue: 'Soft, timeless smile directly to lens' },
      { step: 2, poseId: 'solo_chin_rest_pout', title: 'The Dreamer’s Pout', cue: 'Fingertips to jawline, dreamy upward glance' },
      { step: 3, poseId: 'solo_wink_lip_bite', title: 'The Playful Wink', cue: 'Cheeky wink and playful finger to lip' },
      { step: 4, poseId: 'solo_blown_kiss', title: 'The Blown Kiss', cue: 'Blow a romantic keepsake kiss into the camera' }
    ]
  },
  {
    id: 'challenge_couples_romance',
    category: 'couples',
    title: 'The Romantic & Silly Strip',
    subtitle: 'The Ultimate Couple’s Keepsake',
    description: 'Starts with a close cuddle, escalates into playful teasing, and finishes with a joyous embrace.',
    shots: [
      { step: 1, poseId: 'couple_close_cuddle', title: 'The Classic Cuddle', cue: 'Temples gently touching, warm natural smiles' },
      { step: 2, poseId: 'couple_guess_who', title: 'The ‘Guess Who?’ Surprise', cue: 'Playful hands over eyes with big laughing smiles' },
      { step: 3, poseId: 'couple_cheek_kiss', title: 'The Sweet Cheek Kiss', cue: 'Gentle, affectionate kiss planted on the cheek' },
      { step: 4, poseId: 'couple_warm_embrace', title: 'The Bear Hug Embrace', cue: 'Full squeeze, cheek to neck, celebrating love' }
    ]
  },
  {
    id: 'challenge_friends_chaos',
    category: 'groups',
    title: 'The Besties Chaos Challenge',
    subtitle: 'High-Energy Photobooth Squad Escalation',
    description: 'A hilarious four-step escalation from a polite bestie portrait to full vintage photobooth mayhem.',
    shots: [
      { step: 1, poseId: 'group_besties_hug', title: 'The Day-One Besties', cue: 'Heads leaning in close with warm, genuine smiles' },
      { step: 2, poseId: 'group_spill_the_tea', title: 'The ‘Spill the Tea!’ Shock', cue: 'Whisper a juicy secret with a shocked jaw-drop reaction' },
      { step: 3, poseId: 'group_charlies_angels', title: 'Charlie’s Angels Guns', cue: 'Back-to-back finger guns with confident attitude' },
      { step: 4, poseId: 'group_goofy_tongues', title: 'The Goofy Tongue-Out', cue: 'Embrace tight and flash your funniest silly faces' }
    ]
  }
];

// Helper functions for easy querying
export function getPosesByCategory(category) {
  if (!category || category === 'all') return POSE_LIBRARY;
  return POSE_LIBRARY.filter((p) => p.category === category);
}

export function getPoseById(id) {
  return POSE_LIBRARY.find((p) => p.id === id) || null;
}

export function getChallengesByCategory(category) {
  if (!category || category === 'all') return FOUR_SHOT_CHALLENGES;
  return FOUR_SHOT_CHALLENGES.filter((c) => c.category === category);
}

export function getChallengeById(id) {
  return FOUR_SHOT_CHALLENGES.find((c) => c.id === id) || null;
}
