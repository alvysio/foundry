import tinycolor from 'tinycolor2'

type PrimaryVariations = {
    default: string
    dark: string
    light: string
    medium: string
}

type PalettePair = {
    default: string
    light: string
}

type WarnPalette = PalettePair & {
    dark: string
}

type PaletteOverrides = {
    avatar?: string
    blueLink?: string
    danger?: string
    selection?: string
    warn?: WarnPalette
    success?: PalettePair
}

function generateColorVariations(defaultColor: string, override?: Partial<PrimaryVariations>): PrimaryVariations {
    const defaultColorObj = tinycolor(defaultColor)

    const computed: PrimaryVariations = {
        default: defaultColorObj.toHexString(),
        dark: defaultColorObj.clone().darken(2).toHexString(),
        light: tinycolor.mix(tinycolor('#ffffff'), defaultColorObj.toHex(), 12).toHexString(),
        medium: defaultColorObj.clone().lighten(26).toHexString(),
    }

    return {
        default: override?.default ?? computed.default,
        dark: override?.dark ?? computed.dark,
        light: override?.light ?? computed.light,
        medium: override?.medium ?? computed.medium,
    }
}

function generateSelectionColor(defaultColor: string) {
    return tinycolor(defaultColor).lighten(8).toHexString()
}

export function generateTheme({
    primaryColor,
    primaryOverrides,
    fullLogoUrl,
    favIconUrl,
    logoIconUrl,
    websiteName,
    palette,
}: {
    primaryColor: string
    primaryOverrides?: Partial<PrimaryVariations>
    fullLogoUrl: string
    favIconUrl: string
    logoIconUrl: string
    websiteName: string
    palette?: PaletteOverrides
}) {
    return {
        websiteName,
        colors: {
            avatar: palette?.avatar ?? '#515151',
            'blue-link': palette?.blueLink ?? '#1890ff',
            danger: palette?.danger ?? '#f94949',
            primary: generateColorVariations(primaryColor, primaryOverrides),
            warn: palette?.warn ?? {
                default: '#f78a3b',
                light: '#fff6e4',
                dark: '#cc8805',
            },
            success: palette?.success ?? {
                default: '#14ae5c',
                light: '#3cad71',
            },
            selection: palette?.selection ?? generateSelectionColor(primaryColor),
        },
        logos: {
            fullLogoUrl,
            favIconUrl,
            logoIconUrl,
        },
    }
}

export const defaultTheme = generateTheme({
    primaryColor: '#F17F22',
    websiteName: 'Alvys',
    fullLogoUrl: 'https://cdn.activepieces.com/brand/full-logo.png',
    favIconUrl: 'https://cdn.activepieces.com/brand/logo.svg',
    logoIconUrl: 'https://cdn.activepieces.com/brand/logo.svg',
    primaryOverrides: {
        default: '#F17F22',
        dark: '#CA6716',
        light: '#FFEBDB',
        medium: '#FFD2AD',
    },
    palette: {
        avatar: '#8B8B98',
        blueLink: '#434FEF',
        danger: '#E82C51',
        warn: { default: '#FA9D52', light: '#FFF7D6', dark: '#D7AE09' },
        success: { default: '#00A367', light: '#31C48E' },
        selection: '#FBB67E',
    },
})
