import type { ComponentClass, ComponentPropsWithRef, ComponentType, CSSProperties, FocusEventHandler, FunctionComponent, HtmlHTMLAttributes, HTMLProps, JSX, KeyboardEvent, KeyboardEventHandler, MouseEvent, PointerEvent, PropsWithChildren, ReactNode, Ref, RefObject, SyntheticEvent } from "react";
import type { BaseEditor } from "slate";
import type { ReactEditor } from "slate-react";
import type { DraftType, EditorLayout, EditorToolbarType } from "../enums";
import type { Application, Channel, Command, Emoji, Message, Sticker } from "./common";
import type { CloudUpload } from "./modules";

// #region Old compability

export type HeadingTag = `h${1 | 2 | 3 | 4 | 5 | 6}`;
export type Margins = Record<"marginTop16" | "marginTop8" | "marginBottom8" | "marginTop20" | "marginBottom20", string>;

// copy(find(m => Array.isArray(m) && m.includes("heading-sm/normal")).map(JSON.stringify).join("|"))
export type TextVariant = "heading-sm/normal" | "heading-sm/medium" | "heading-sm/semibold" | "heading-sm/bold" | "heading-sm/extrabold" | "heading-md/normal" | "heading-md/medium" | "heading-md/semibold" | "heading-md/bold" | "heading-md/extrabold" | "heading-lg/normal" | "heading-lg/medium" | "heading-lg/semibold" | "heading-lg/bold" | "heading-lg/extrabold" | "heading-xl/normal" | "heading-xl/medium" | "heading-xl/semibold" | "heading-xl/bold" | "heading-xl/extrabold" | "heading-xxl/normal" | "heading-xxl/medium" | "heading-xxl/semibold" | "heading-xxl/bold" | "heading-xxl/extrabold" | "text-xxs/normal" | "text-xxs/medium" | "text-xxs/semibold" | "text-xxs/bold" | "text-xs/normal" | "text-xs/medium" | "text-xs/semibold" | "text-xs/bold" | "text-sm/normal" | "text-sm/medium" | "text-sm/semibold" | "text-sm/bold" | "text-md/normal" | "text-md/medium" | "text-md/semibold" | "text-md/bold" | "text-lg/normal" | "text-lg/medium" | "text-lg/semibold" | "text-lg/bold";

export type TextProps = PropsWithChildren<HtmlHTMLAttributes<HTMLDivElement> & {
    variant?: TextVariant;
    tag?: "div" | "span" | "p" | "strong" | HeadingTag;
}>;

export type Text = ComponentType<TextProps>;

export interface ButtonProps extends PropsWithChildren<Omit<HTMLProps<HTMLButtonElement>, "size">> {
    /** Button.Looks.FILLED */
    look?: string;
    /** Button.Colors.BRAND */
    color?: string;
    /** Button.Sizes.MEDIUM */
    size?: string;

    className?: string;
}

export type Button = ComponentType<ButtonProps> & {
    Colors: Record<"BRAND" | "RED" | "GREEN" | "PRIMARY" | "LINK" | "WHITE" | "TRANSPARENT" | "CUSTOM", string>;
    Looks: Record<"FILLED" | "LINK", string>;
    Sizes: Record<"NONE" | "SMALL" | "MEDIUM" | "LARGE" | "XLARGE" | "MIN", string>;
};

// #endregion

export interface TooltipChildrenProps {
    onClick(): void;
    onMouseEnter(): void;
    onMouseLeave(): void;
    onContextMenu(): void;
    onFocus(): void;
    onBlur(): void;
    "aria-label"?: string;
}

export interface TooltipProps {
    text: ReactNode | ComponentType;
    children: FunctionComponent<TooltipChildrenProps>;
    "aria-label"?: string;

    allowOverflow?: boolean;
    forceOpen?: boolean;
    hide?: boolean;
    hideOnClick?: boolean;
    shouldShow?: boolean;
    spacing?: number;

    /** Tooltip.Colors.BLACK */
    color?: string;
    /** TooltipPositions.TOP */
    position?: PopoutPosition;

    tooltipClassName?: string;
    tooltipContentClassName?: string;
}

export type Tooltip = ComponentType<TooltipProps> & {
    Colors: Record<"BLACK" | "BRAND" | "CUSTOM" | "GREEN" | "GREY" | "PRIMARY" | "RED" | "YELLOW", string>;
};

export type TooltipPositions = Record<"BOTTOM" | "CENTER" | "LEFT" | "RIGHT" | "TOP" | "WINDOW_CENTER", string>;

export type TooltipContainer = ComponentType<PropsWithChildren<{
    text: ReactNode;
    element?: "div" | "span";
    "aria-label"?: string | false;

    delay?: number;
    /** Tooltip.Colors.BLACK */
    color?: string;
    /** TooltipPositions.TOP */
    position?: PopoutPosition;
    spacing?: number;

    className?: string;
    tooltipClassName?: string | null;
    tooltipContentClassName?: string | null;

    allowOverflow?: boolean;
    forceOpen?: boolean;
    hideOnClick?: boolean;
    disableTooltipPointerEvents?: boolean;
}>>;

export type Card = ComponentType<PropsWithChildren<HTMLProps<HTMLDivElement> & {
    editable?: boolean;
    outline?: boolean;
    /** Card.Types.PRIMARY */
    type?: string;
}>> & {
    Types: Record<"BRAND" | "CUSTOM" | "DANGER" | "PRIMARY" | "SUCCESS" | "WARNING", string>;
};

export type ComboboxPopout = ComponentType<PropsWithChildren<{
    value: Set<any>;
    placeholder: string;
    children(query: string): ReactNode[];

    onChange(value: any): void;
    itemToString?: (item: any) => string;
    onClose?(): void;

    className?: string;
    listClassName?: string;

    autoFocus?: boolean;
    multiSelect?: boolean;
    maxVisibleItems?: number;
    showScrollbar?: boolean;

}>>;

export type CheckboxAligns = {
    CENTER: "center";
    TOP: "top";
};

export type CheckboxTypes = {
    DEFAULT: "default";
    INVERTED: "inverted";
    GHOST: "ghost";
    ROW: "row";
};

export type Checkbox = ComponentType<PropsWithChildren<{
    value: boolean;
    onChange(event: PointerEvent, value: boolean): void;

    align?: "center" | "top";
    disabled?: boolean;
    displayOnly?: boolean;
    readOnly?: boolean;
    reverse?: boolean;
    shape?: string;
    size?: number;
    type?: "default" | "inverted" | "ghost" | "row";
}>> & {
    Shapes: Record<"BOX" | "ROUND" | "SMALL_BOX", string>;
    Aligns: CheckboxAligns;
    Types: CheckboxTypes;
};

export type Timestamp = ComponentType<PropsWithChildren<{
    timestamp: Date;
    isEdited?: boolean;

    className?: string;
    id?: string;

    cozyAlt?: boolean;
    compact?: boolean;
    isInline?: boolean;
    isVisibleOnlyOnHover?: boolean;
}>>;

export type TextInput = ComponentType<PropsWithChildren<{
    name?: string;
    onChange?(value: string, name?: string): void;
    placeholder?: string;
    editable?: boolean;
    /** defaults to 999. Pass null to disable this default */
    maxLength?: number | null;
    error?: string;

    inputClassName?: string;
    inputPrefix?: string;
    inputRef?: Ref<HTMLInputElement>;
    prefixElement?: ReactNode;

    focusProps?: any;

    /** TextInput.Sizes.DEFAULT */
    size?: string;
} & Omit<HTMLProps<HTMLInputElement>, "onChange" | "maxLength">>> & {
    Sizes: Record<"DEFAULT" | "MINI", string>;
};

// FIXME: this is wrong, it's not actually just HTMLTextAreaElement
export type TextArea = ComponentType<Omit<HTMLProps<HTMLTextAreaElement>, "onChange"> & {
    onChange(v: string): void;
    inputRef?: Ref<HTMLTextAreaElement>;
}>;

interface SelectOption {
    disabled?: boolean;
    value: any;
    label: string;
    key?: React.Key;
    default?: boolean;
}

export type Select = ComponentType<PropsWithChildren<{
    placeholder?: string;
    options: ReadonlyArray<SelectOption>; // TODO

    /**
     * - 0 ~ Filled
     * - 1 ~ Custom
     */
    look?: 0 | 1;
    className?: string;
    popoutClassName?: string;
    popoutPosition?: PopoutPosition;
    optionClassName?: string;

    autoFocus?: boolean;
    isDisabled?: boolean;
    clearable?: boolean;
    closeOnSelect?: boolean;
    hideIcon?: boolean;

    select(value: any): void;
    isSelected(value: any): boolean;
    serialize(value: any): string;
    clear?(): void;

    maxVisibleItems?: number;
    popoutWidth?: number;

    onClose?(): void;
    onOpen?(): void;

    renderOptionLabel?(option: SelectOption): ReactNode;
    /** discord stupid this gets all options instead of one yeah */
    renderOptionValue?(option: SelectOption[]): ReactNode;

    "aria-label"?: boolean;
    "aria-labelledby"?: boolean;
}>>;

export type SearchableSelect = ComponentType<PropsWithChildren<{
    placeholder?: string;
    options: ReadonlyArray<SelectOption>; // TODO
    value?: SelectOption;

    /**
     * - 0 ~ Filled
     * - 1 ~ Custom
     */
    look?: 0 | 1;
    className?: string;
    popoutClassName?: string;
    wrapperClassName?: string;
    popoutPosition?: PopoutPosition;
    optionClassName?: string;

    autoFocus?: boolean;
    isDisabled?: boolean;
    clearable?: boolean;
    closeOnSelect?: boolean;
    clearOnSelect?: boolean;
    multi?: boolean;

    onChange(value: any): void;
    onSearchChange?(value: string): void;

    onClose?(): void;
    onOpen?(): void;
    onBlur?(): void;

    renderOptionPrefix?(option: SelectOption): ReactNode;
    renderOptionSuffix?(option: SelectOption): ReactNode;

    filter?(option: SelectOption[], query: string): SelectOption[];

    centerCaret?: boolean;
    debounceTime?: number;
    maxVisibleItems?: number;
    popoutWidth?: number;

    "aria-labelledby"?: boolean;
}>>;

export type Slider = ComponentClass<PropsWithChildren<{
    initialValue: number;
    defaultValue?: number;
    keyboardStep?: number;
    maxValue?: number;
    minValue?: number;
    markers?: number[];
    stickToMarkers?: boolean;

    /** 0 above, 1 below */
    markerPosition?: 0 | 1;
    orientation?: "horizontal" | "vertical";

    getAriaValueText?(currentValue: number): string;
    renderMarker?(marker: number): ReactNode;
    onMarkerRender?(marker: number): ReactNode;
    onValueRender?(value: number): ReactNode;
    onValueChange?(value: number): void;
    asValueChanges?(value: number): void;

    className?: string;
    disabled?: boolean;
    handleSize?: number;
    mini?: boolean;
    hideBubble?: boolean;

    fillStyles?: CSSProperties;
    barStyles?: CSSProperties;
    grabberStyles?: CSSProperties;
    grabberClassName?: string;
    barClassName?: string;

    "aria-hidden"?: boolean;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-describedby"?: string;
}>>;

declare enum PopoutAnimation {
    NONE = "1",
    TRANSLATE = "2",
    SCALE = "3",
    FADE = "4"
}

type PopoutPosition = "top" | "bottom" | "left" | "right" | "center" | "window_center";

export type Popout = ComponentType<{
    children(
        thing: {
            "aria-controls": string;
            "aria-expanded": boolean;
            onClick(event: MouseEvent<HTMLElement>): void;
            onKeyDown(event: KeyboardEvent<HTMLElement>): void;
            onMouseDown(event: MouseEvent<HTMLElement>): void;
        },
        data: {
            isShown: boolean;
            position: PopoutPosition;
        }
    ): ReactNode;
    shouldShow?: boolean;
    targetElementRef: RefObject<any>;
    renderPopout(args: {
        closePopout(): void;
        isPositioned: boolean;
        nudge: number;
        position: PopoutPosition;
        setPopoutRef(ref: any): void;
        updatePosition(): void;
    }): ReactNode;

    onRequestOpen?(): void;
    onRequestClose?(): void;

    /** "center" and others */
    align?: "left" | "right" | "center";
    /** Popout.Animation */
    animation?: PopoutAnimation;
    autoInvert?: boolean;
    nudgeAlignIntoViewport?: boolean;
    /** "bottom" and others */
    position?: PopoutPosition;
    positionKey?: string;
    spacing?: number;
}> & {
    Animation: typeof PopoutAnimation;
};

export type Dialog = ComponentType<JSX.IntrinsicElements["div"]>;

type Resolve = (data: { theme: "light" | "dark", saturation: number; }) => {
    hex(): string;
    hsl(): string;
    int(): number;
    spring(): string;
};

export type useToken = (color: {
    css: string;
    resolve: Resolve;
}) => ReturnType<Resolve>;

export type Paginator = ComponentType<{
    currentPage: number;
    maxVisiblePages: number;
    pageSize: number;
    totalCount: number;

    onPageChange?(page: number): void;
    hideMaxPage?: boolean;
}>;

export type MaskedLink = ComponentType<PropsWithChildren<{
    href: string;
    rel?: string;
    target?: string;
    title?: string,
    className?: string;
    tabIndex?: number;
    onClick?(): void;
    trusted?: boolean;
    messageId?: string;
    channelId?: string;
}>>;

export interface ScrollerBaseProps {
    className?: string;
    style?: CSSProperties;
    dir?: "ltr";
    paddingFix?: boolean;
    onClose?(): void;
    onScroll?(): void;
}

export type ScrollerThin = ComponentType<PropsWithChildren<ScrollerBaseProps & {
    orientation?: "horizontal" | "vertical" | "auto";
    fade?: boolean;
}>>;

interface BaseListItem {
    anchorId: any;
    listIndex: number;
    offsetTop: number;
    section: number;
}
interface ListSection extends BaseListItem {
    type: "section";
}
interface ListRow extends BaseListItem {
    type: "row";
    row: number;
    rowIndex: number;
}

export type ListScrollerThin = ComponentType<ScrollerBaseProps & {
    sections: number[];
    renderSection?: (item: ListSection) => React.ReactNode;
    renderRow: (item: ListRow) => React.ReactNode;
    renderFooter?: (item: any) => React.ReactNode;
    renderSidebar?: (listVisible: boolean, sidebarVisible: boolean) => React.ReactNode;
    wrapSection?: (section: number, children: React.ReactNode) => React.ReactNode;

    sectionHeight: number;
    rowHeight: number;
    footerHeight?: number;
    sidebarHeight?: number;

    chunkSize?: number;

    paddingTop?: number;
    paddingBottom?: number;
    fade?: boolean;
    onResize?: Function;
    getAnchorId?: any;

    innerTag?: string;
    innerId?: string;
    innerClassName?: string;
    innerRole?: string;
    innerAriaLabel?: string;
    // Yes, Discord uses this casing
    innerAriaMultiselectable?: boolean;
    innerAriaOrientation?: "vertical" | "horizontal";
}>;

export type Clickable = <T extends "a" | "div" | "span" | "li" = "div">(props: PropsWithChildren<ComponentPropsWithRef<T>> & {
    tag?: T;
}) => ReactNode;

export type Avatar = ComponentType<PropsWithChildren<{
    className?: string;

    src?: string;
    size?: "SIZE_16" | "SIZE_20" | "SIZE_24" | "SIZE_32" | "SIZE_40" | "SIZE_48" | "SIZE_56" | "SIZE_80" | "SIZE_120";

    statusColor?: string;
    statusTooltip?: string;
    statusBackdropColor?: string;

    isMobile?: boolean;
    isTyping?: boolean;
    isSpeaking?: boolean;

    typingIndicatorRef?: unknown;

    "aria-hidden"?: boolean;
    "aria-label"?: string;
}>>;

type FocusLock = ComponentType<PropsWithChildren<{
    containerRef: Ref<HTMLElement>;
}>>;

export type Icon = ComponentType<JSX.IntrinsicElements["svg"] & {
    size?: string;
    colorClass?: string;
} & Record<string, any>>;

export type ColorPicker = ComponentType<{
    color: number | null;
    showEyeDropper?: boolean;
    suggestedColors?: string[];
    label?: ReactNode;
    onChange(value: number | null): void;
}>;

interface SlateElement {
    type: string;
    children: SlateNode[];
}

interface SlateTextNode {
    text: string;
}

type SlateNode = SlateElement | SlateTextNode;

// Not all properties of ReactEditor are actually present, most likely due to treeshaking
export interface SlateEditor extends BaseEditor, Partial<Omit<ReactEditor, keyof BaseEditor>> {
    children: SlateNode[];
    chatInputType: Partial<RichInputType>;
    undo: () => void;
    redo: () => void;
    previewMarkdown: boolean;
}

// All command option values are converted into their text representation when accessed
interface CommandOptionTextValue {
    type: "text";
    text: string
}

export interface SlateEditorRef {
    getSlateEditor: () => SlateEditor;

    submit: (event: SyntheticEvent) => void;
    blur: () => void;
    focus: () => void;

    getCurrentWord: () => { word: string; isAtStart: boolean; fullWord?: string; };
    getFirstText: () => string;
    getCurrentCommandOption: () => string;
    getCurrentCommandOptionValue: () => CommandOptionTextValue[];
    getCommandOptionValues: () => Record<string, CommandOptionTextValue[]>;

    // `text` is the simplest representation of the input, eg `:emoji:`, while rawText stores the full `<:emoji:id>`
    insertText: (text: string, rawText?: string | null, addSpace?: boolean) => void;
    insertAutocomplete: (text: string, rawText?: string | null, options?: { addSpace?: boolean; replaceFullWord?: boolean }) => void;
    insertInlineAutocompleteInput: (type: SlateElement["type"]) => void;
    insertEmoji: (options: { emoji: Emoji; addSpace?: boolean }) => void;

    replaceInlineAutocompleteInput: (text: string, rawText?: string | null) => void;
}

interface RichInputState {
    focused: boolean;
    submitting: boolean;
    popup: {
        id: string | null;
        activeDescendant: string | null;
    };
}

interface RichInputRef {
    state: RichInputState;
    ref: RefObject<SlateEditorRef | null>;

    focus: () => void;
    hideAutocomplete: () => void;
    maybeShowAutocomplete: () => void;
    saveCurrentText: () => void;
    saveCurrentTextThrottled: (() => void) & { cancel: () => void; flush: () => void };
}

declare enum CommandType {
    BUILT_IN = 0,
    APPLICATION = 1
}

interface CommandSection {
    name: string;
    id: string;
    botId: string;
    icon: string;
    isUserApp: boolean;
    type: CommandType;
    permissions: bigint | undefined;
    application: Application;
}

interface RichInputSubmitState {
    value: string;
    isGif: boolean;
    uploads: CloudUpload[];
    stickers: Sticker[];
    command: Command | null;
    commandOptionValues: Record<string, CommandOptionTextValue[]> | undefined;
}

export type RichInput = ComponentType<PropsWithChildren<{
    id?: string;
    type: Partial<RichInputType>;
    textValue: string;
    richValue?: SlateNode[];
    parentModalKey?: string;
    maxCharacterCount?: number;

    error?: string;
    placeholder?: string;
    accessibilityLabel?: string;

    disabled?: boolean;
    focused?: boolean;
    highlighted?: boolean;
    required?: boolean;

    className?: string;
    innerClassName?: string;
    editorClassName?: string;
    characterCountClassName?: string;

    canMentionRoles?: boolean;
    canMentionChannels?: boolean;
    showRemainingCharsAfterCount?: number;
    allowNewLines?: boolean;
    autoCompletePosition?: "top" | "bottom";
    disableThemedBackground?: boolean;
    emojiPickerCloseOnModalOuterClick?: boolean;
    showValueWhenDisabled?: boolean;

    channel: Channel;
    pendingReply?: { channel: Channel; message: Message; shouldMention: boolean; showMentionToggle: boolean };
    pendingScheduledMessage?: { channelId: string; scheduledTimestamp: string | number };

    ref?: RefObject<HTMLDivElement>;
    setEditorRef?: (editor: RichInputRef) => void;

    renderAttachButton?: (hasPendingReply: boolean, className: string) => ReactNode;
    renderApplicationCommandIcon?: (activeCommand: Command, activeCommandSection: CommandSection, className: string) => ReactNode;
    renderButtons?: () => ReactNode;

    onChange?: (_: unknown, textValue: string, richValue: SlateNode[]) => void;
    onResize?: (editorHeight: number) => void;
    onBlur?: FocusEventHandler<HTMLDivElement>;
    onFocus?: FocusEventHandler<HTMLDivElement>;
    onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
    onSubmit?: (state: RichInputSubmitState) => Promise<{ shouldClear: boolean; shouldRefocus: boolean }>;

    promptToUpload?: (files: FileList, channel: Channel, draftType: DraftType) => Promise<void>;

    "aria-describedby"?: string;
    "aria-labelledby"?: string;
}>>;

type EditorOption<T extends string | null = null> = [T] extends [string] ? Partial<Record<T, boolean>> : boolean;

export interface RichInputType {
    analyticsName: string;

    attachments: EditorOption;
    commands: EditorOption<"enabled">;
    emojis: EditorOption<"button">;
    expressionPicker: EditorOption<"onlyEmojis">;
    gifs: EditorOption<"button" | "allowSending">;
    gifts: EditorOption<"button">;
    soundmoji: EditorOption<"allowSending">;
    stickers: EditorOption<"button" | "allowSending" | "autoSuggest">;
    users: EditorOption<"allowMentioning">;

    uploadLongMessages: EditorOption;
    upsellLongMessages: EditorOption<"iconOnly">;
    showCharacterCount: EditorOption;

    permissions: EditorOption<"requireSendMessages" | "requireCreateTherads">; // `therads` is not a typo!
    showSlowmodeIndicator: EditorOption;
    showThreadPromptOnReply: EditorOption;
    showTypingIndicator: EditorOption;

    autocomplete: EditorOption<"addReactionShortcut" | "forceChatLayer" | "reactions" | "mentionSuggestions" | "alwaysUseLayer" | "small">;
    disableAutoFocus: EditorOption;
    drafts: Partial<{ type: DraftType; commandType: DraftType; autoSave: boolean }>;
    hideAccessoryBar: EditorOption;
    hideAttachmentArea: EditorOption;
    submit: EditorOption<"button" | "ignorePreference" | "disableEnterToSubmit" | "clearOnSubmit" | "useDisabledStylesOnSubmit" | "allowEmptyMessage">;
    layout: EditorLayout;
    markdown: EditorOption<"disableCodeBlocks" | "disableBlockQuotes" | "disableInlineCode">;
    toolbarType: EditorToolbarType;

    confetti: EditorOption<"button">;
    sedReplace: EditorOption;
}
