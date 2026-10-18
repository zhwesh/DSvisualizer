export const ICON_PATHS = {
    plus: ['M12 5v14', 'M5 12h14'],
    minus: ['M5 12h14'],
    search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14', 'M20 20l-4.35-4.35'],
    pencil: ['M4 20l4.5-1 10-10a2.12 2.12 0 0 0-3-3l-10 10L4 20z', 'M13.5 6.5l4 4'],
    trash: ['M4 7h16', 'M9 7V5h6v2', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
    rotate: ['M4 10a8 8 0 1 1 2.34 7.66', 'M4 4v6h6'],
    refresh: ['M20 12a8 8 0 1 1-2.34-5.66', 'M20 4v6h-6'],
    settings: ['M4 7h16', 'M4 17h16', 'M9 4v6', 'M15 14v6'],
    play: ['M8 5v14l11-7z'],
    fastForward: ['M4 5v14l7-7z', 'M12 5v14l7-7z'],
    pause: ['M9 5v14', 'M15 5v14'],
    stepForward: ['M6 5v14l9-7z', 'M18 5v14'],
    list: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
    eye: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
    sum: ['M18 5H7l6 7-6 7h11'],
} as const;

export type IconName = keyof typeof ICON_PATHS;
