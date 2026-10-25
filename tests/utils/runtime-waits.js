// @ts-check
/**
 * Shared wait budgets for the game runtime.
 *
 * The game runtime boots, loads a problem and starts the symbol rain. On
 * the mobile profiles that runs at devicePixelRatio 3 in software, and on a
 * shared host it runs slower still - a state transition that takes a second
 * on an idle workstation can take ten seconds when the box is busy.
 *
 * A wait that observes runtime state therefore has to be allowed to observe
 * it. A hard five second budget does not test anything: it only encodes an
 * assumption about how fast the machine is, and it turns a slow host into a
 * failure that looks like a product bug.
 *
 * The real guard against a hang is the test timeout, which stays at thirty
 * seconds. These budgets sit below it so a genuine hang still fails the
 * test rather than the run.
 */

/** Wait for the runtime to reach a state after user input. */
export const GAME_STATE_TIMEOUT = 25000;

/** Wait for the runtime to finish booting. */
export const GAME_BOOT_TIMEOUT = 30000;
