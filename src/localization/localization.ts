import { Settings } from "../core/settings";
import { localizationTable } from '../secretRegistry';

export enum Key {
    Loading = "loading",
    PressAnyContinue = "pressAnyContinue",
    ToTest = "toTest",
    Lang = "lang",
    LongText = "longText",
    Back = "back",
    HintText = "hintText",
    OptionA = "optionA",
    OptionB = "optionB",
    OptionC = "optionC",
    MutedIconHover = "mutedIconHover",
    Settings = "settings",
    Locale = "locale",
    Volume = "volume",
    ShowHints = "showHints",
    ShowFps = "showFps",
    Resolution = "resolution",
    MaxFps = "maxFps",
    English = "english",
    Polish = "polish",
    Enabled = "enabled",
    Disabled = "disabled",
    Unlimited = "unlimited",
    Defaults = "defaults",
    Match = "match",
    MaxFpsHint = "maxFpsHint",
    ResolutionHint = "resolutionHint",
    ShowHintsHint = "showHintsHint",
    ShowFpsHint = "showFpsHint",
    SettingsPanelHint = "settingsPanelHint",
    DefaultsButtonHint = "defaultsButtonHint",
    MainMenu = "mainMenu",
    About = "about",
    AboutMe = "aboutMe",
    Contact = "contact",
    Education = "education",
    Career = "career",
    Skills = "skills",
    AboutMePage = "aboutMePage",
    ContactPage = "contactPage",
    EducationPage = "educationPage",
    CareerPage = "careerPage",
    SkillsPage = "skillsPage",
    CVPanelHint = "cvPanelHint",
    AboutText = "aboutText",
    GitHubHint = "gitHubHint",
    PortfolioHint = "portfolioHint",
}

export enum Locale {
    EN = "en",
    PL = "pl",
}

const dictionary = JSON.parse(localizationTable);

export class Localization {
    private locale: Locale;

    private constructor() {}

    static create(settings: Settings) {
        const localization = new Localization();
        localization.locale = settings.locale;

        settings.onLocaleChanged.add(() => {
            localization.locale = settings.locale;
        });

        return localization;
    }

    translate(key: Key | string) {
        return dictionary[key as Key]?.[this.locale] ?? `[ERR]${key}`;
    }
}
