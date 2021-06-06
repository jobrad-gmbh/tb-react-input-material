// #!/usr/bin/env babel-node
// -*- coding: utf-8 -*-
/** @module GenericInput */
'use strict'
/* !
    region header
    [Project page](https://torben.website/react-material-input)

    Copyright Torben Sickert (info["~at~"]torben.website) 16.12.2012

    License
    -------

    This library written by Torben Sickert stand under a creative commons
    naming 3.0 unported license.
    See https://creativecommons.org/licenses/by/3.0/deed.de
    endregion
*/
// region imports
import Tools, {optionalRequire} from 'clientnode'
import {EvaluationResult, FirstParameter, Mapping} from 'clientnode/type'
import {
    ComponentType,
    createRef,
    FocusEvent as ReactFocusEvent,
    forwardRef,
    ForwardRefRenderFunction,
    KeyboardEvent as ReactKeyboardEvent,
    lazy,
    memo as memorize,
    MouseEvent as ReactMouseEvent,
    ReactElement,
    RefCallback,
    RefObject,
    Suspense,
    useEffect,
    useImperativeHandle,
    useState,
    VoidFunctionComponent
} from 'react'
import CodeEditorType, {IAceEditorProps as CodeEditorProps} from 'react-ace'
import {TransitionProps} from 'react-transition-group/Transition'
import {
    Editor as RichTextEditor, RawEditorSettings as RawTinyMCEEditorSettings
} from 'tinymce'
import {MDCSelectFoundation} from '@material/select'
import {MDCTextFieldFoundation} from '@material/textfield'
import {CircularProgress} from '@rmwc/circular-progress'
import {FormField} from '@rmwc/formfield'
import {Icon} from '@rmwc/icon'
import {IconButton} from '@rmwc/icon-button'
import {
    FormattedOption as FormattedSelectionOption, Select, SelectProps
} from '@rmwc/select'
import {TextField, TextFieldProps} from '@rmwc/textfield'
import {Theme} from '@rmwc/theme'
import {IconOptions} from '@rmwc/types'
import {
    Editor as RichTextEditorComponent, IAllProps as RichTextEditorProps
} from '@tinymce/tinymce-react'
import {
    EventHandler as RichTextEventHandler
} from '@tinymce/tinymce-react/lib/cjs/main/ts/Events'

import Dummy from './Dummy'
import GenericAnimate from './GenericAnimate'
import styles from './GenericInput.module'
import WrapConfigurations from './WrapConfigurations'
import WrapTooltip from './WrapTooltip'
import {
    deriveMissingPropertiesFromState as deriveMissingBasePropertiesFromState,
    determineInitialValue,
    determineInitialRepresentation,
    determineValidationState as determineBaseValidationState,
    formatValue,
    getConsolidatedProperties as getBaseConsolidatedProperties,
    mapPropertiesIntoModel,
    parseValue,
    transformValue,
    translateKnownSymbols,
    triggerCallbackIfExists,
    useMemorizedValue,
    wrapStateSetter
} from '../helper'
import {
    CursorState,
    DataTransformSpecification,
    defaultInputModelState as defaultModelState,
    DefaultInputProperties as DefaultProperties,
    defaultInputProperties as defaultProperties,
    EditorState,
    GenericEvent,
    InputAdapter as Adapter,
    InputAdapterWithReferences as AdapterWithReferences,
    InputDataTransformation,
    InputModelState as ModelState,
    InputProperties as Properties,
    inputPropertyTypes as propertyTypes,
    InputProps as Props,
    InputState as State,
    InputModel as Model,
    NativeInputType,
    Renderable,
    StaticFunctionInputComponent as StaticComponent,
    InputValueState as ValueState
} from '../type'

declare var TARGET_TECHNOLOGY:string
const isBrowser:boolean =
    !(TARGET_TECHNOLOGY === 'node' || typeof window === undefined)
const UseAnimations:any|null =
    isBrowser ? optionalRequire('react-useanimations') : null
const lock:any|null = isBrowser ?
    optionalRequire('react-useanimations/lib/lock') :
    null
const plusToX:any|null = isBrowser ?
    optionalRequire('react-useanimations/lib/plusToX') :
    null
// endregion
// region code editor configuration
export const ACEEditorOptions = {
    basePath: '/node_modules/ace-builds/src-noconflict/',
    useWorker: false
}
const CodeEditor = lazy(async ():Promise<{default:ComponentType<any>}> => {
    const {config} = await import('ace-builds')
    for (const [name, value] of Object.entries(ACEEditorOptions))
        config.set(name, value)
    return await import('react-ace')
})
// endregion
// region rich text editor configuration
export type TinyMCEOptions = RawTinyMCEEditorSettings & {
    selector?:undefined
    target?:undefined
}
declare var UTC_BUILD_TIMESTAMP:number
// NOTE: Could be set via module bundler environment variables.
if (typeof UTC_BUILD_TIMESTAMP === 'undefined')
    /* eslint-disable no-var */
    var UTC_BUILD_TIMESTAMP:number = 1
    /* eslint-enable no-var */
let richTextEditorLoadedOnce:boolean = false
const tinymceBasePath:string = '/node_modules/tinymce/'
export const TINYMCE_DEFAULT_OPTIONS:TinyMCEOptions = {
    /* eslint-disable camelcase */
    // region paths
    base_url: tinymceBasePath,
    skin_url: `${tinymceBasePath}skins/ui/oxide`,
    theme_url: `${tinymceBasePath}themes/silver/theme.min.js`,
    // endregion
    allow_conditional_comments: false,
    allow_script_urls: false,
    body_class: 'mdc-text-field__input',
    branding: false,
    cache_suffix: `?version=${UTC_BUILD_TIMESTAMP}`,
    contextmenu: false,
    convert_fonts_to_spans: true,
    document_base_url: '/',
    element_format: 'xhtml',
    entity_encoding: 'raw',
    fix_list_elements: true,
    hidden_input: false,
    icon: 'material',
    invalid_elements: 'em',
    invalid_styles: 'color font-size line-height',
    keep_styles: false,
    menubar: false,
    /* eslint-disable max-len */
    plugins: 'fullscreen link code hr nonbreaking searchreplace visualblocks',
    /* eslint-enable max-len */
    relative_urls: false,
    remove_script_host: false,
    remove_trailing_brs: true,
    schema: 'html5',
    /* eslint-disable max-len */
    toolbar1: 'cut copy paste | undo redo removeformat | styleselect formatselect fontselect fontsizeselect | searchreplace visualblocks fullscreen code',
    toolbar2: 'alignleft aligncenter alignright alignjustify outdent indent | link hr nonbreaking bullist numlist bold italic underline strikethrough',
    /* eslint-enable max-len */
    trim: true
    /* eslint-enable camelcase */
}
// endregion
// region static helper
export function normalizeSelection(
    selection?:Array<[string, string]>|SelectProps['options']|Array<{label?:string;value:any}>,
    labels?:Array<string>|Mapping
):SelectProps['options']|Array<{label?:string;value:any}> {
    if (!selection) {
        selection = labels
        labels = undefined
    }
    if (Array.isArray(selection) && selection.length) {
        const result:Array<FormattedSelectionOption> = []
        let index:number = 0
        if (Array.isArray(selection[0]))
            for (
                const [value, label] of selection as Array<[string, string]>
            ) {
                result.push({
                    label: Array.isArray(labels) && index < labels.length ?
                        labels[index] :
                        label,
                    value
                })
                index += 1
            }
        else if (selection[0] !== null && typeof selection[0] === 'object')
            for (
                const option of selection as Array<FormattedSelectionOption>
            ) {
                result.push({
                    ...(option as FormattedSelectionOption),
                    label: Array.isArray(labels) && index < labels.length ?
                        labels[index] :
                        option.label
                })
                index += 1
            }
        else
            for (const value of selection as Array<string>) {
                result.push({
                    label: Array.isArray(labels) && index < labels.length ?
                        labels[index] :
                        value,
                    value
                })
                index += 1
            }
        selection = result
    }
    if (labels !== null && typeof labels === 'object') {
        if (Array.isArray(selection)) {
            const result:Array<FormattedSelectionOption> = []
            for (const option of selection as Array<FormattedSelectionOption>)
                result.push({
                    ...option,
                    label: labels.hasOwnProperty(
                        (option.value || option.label) as string
                    ) ?
                        (
                            labels as Mapping
                        )[(option.value || option.label) as string] :
                        // Map boolean values to their string representation.
                        (
                            (option as unknown as {value:boolean}).value ===
                                true &&
                            (labels as {true:string}).true
                        ) ?
                            (labels as {true:string}).true :
                            (
                                (
                                    option as unknown as {value:boolean}
                                ).value === false &&
                                (labels as {false:string}).false
                            ) ?
                                (labels as {false:string}).false :
                                option.label
                })
            return result
        }
        for (const [value, label] of Object.entries(selection as Mapping))
            (selection as Mapping)[value] = labels.hasOwnProperty(value) ?
                (labels as Mapping)[value] as string :
                label
    }
    return selection as SelectProps['options']
}
export function determineValidationState(
    properties:DefaultProperties, currentState:Partial<ModelState>
):boolean {
    return determineBaseValidationState<
        DefaultProperties, Partial<ModelState>
    >(
        properties,
        currentState,
        {
            invalidMaximum: ():boolean => (
                typeof properties.model.maximum === 'number' &&
                typeof properties.model.value === 'number' &&
                !isNaN(properties.model.value) &&
                properties.model.maximum >= 0 &&
                properties.model.maximum < properties.model.value
            ),
            invalidMaximumLength: ():boolean => (
                typeof properties.model.maximumLength === 'number' &&
                typeof properties.model.value === 'string' &&
                properties.model.maximumLength >= 0 &&
                properties.model.maximumLength < properties.model.value.length
            ),
            invalidMinimum: ():boolean => (
                typeof properties.model.minimum === 'number' &&
                typeof properties.model.value === 'number' &&
                !isNaN(properties.model.value) &&
                properties.model.value < properties.model.minimum
            ),
            invalidMinimumLength: ():boolean => (
                typeof properties.model.minimumLength === 'number' &&
                typeof properties.model.value === 'string' &&
                properties.model.value.length < properties.model.minimumLength
            ),
            invalidInvertedPattern: ():boolean => (
                typeof properties.model.value === 'string' &&
                (
                    typeof properties.model
                        .invertedRegularExpressionPattern === 'string' &&
                    (new RegExp(
                        properties.model.invertedRegularExpressionPattern
                    )).test(properties.model.value) ||
                    properties.model
                        .invertedRegularExpressionPattern !== null &&
                    typeof properties.model
                        .invertedRegularExpressionPattern === 'object' &&
                    properties.model.invertedRegularExpressionPattern
                        .test(properties.model.value)
                )
            ),
            invalidPattern: ():boolean => (
                typeof properties.model.value === 'string' &&
                (
                    typeof properties.model.regularExpressionPattern ===
                        'string' &&
                    !(new RegExp(properties.model.regularExpressionPattern))
                        .test(properties.model.value) ||
                    properties.model.regularExpressionPattern !== null &&
                    typeof properties.model.regularExpressionPattern ===
                        'object' &&
                    !properties.model.regularExpressionPattern
                        .test(properties.model.value)
                )
            )
        }
    )
}
// endregion
/**
 * Generic input wrapper component which automatically determines a useful
 * input field depending on given model specification.
 *
 * Dataflow:
 *
 * 1. On-Render all states are merged with given properties into a normalized
 *    property object.
 * 2. Properties, corresponding state values and sub node instances are saved
 *    into a "ref" object (to make them accessible from the outside e.g. for
 *    wrapper like web-components).
 * 3. Event handler saves corresponding data modifications into state and
 *    normalized properties object.
 * 4. All state changes except selection changes trigger an "onChange" event
 *    which delivers the consolidated properties object (with latest
 *    modifications included).
 *
 * @property static:displayName - Descriptive name for component to show in web
 * developer tools.
 *
 * @param props - Given components properties.
 * @param reference - Reference object to forward internal state.
 * @returns React elements.
 */
export function GenericInputInner<Type = unknown,>(
    props:Props<Type>, reference?:RefObject<Adapter<Type>>
):ReactElement {
    // region live-cycle
    /**
     * Is triggered immediate after a re-rendering. Re-stores cursor selection
     * state if editor has been switched.
     * @returns Nothing.
     */
    useEffect(():void => {
        if (selectionIsUnstable || editorState.selectionIsUnstable)
            if (properties.editorIsActive) {
                /*
                    NOTE: If the corresponding editor are not loaded yet they
                    will set the selection state on initialisation as long as
                    "editorState.selectionIsUnstable" is set to "true".
                */
                if (codeEditorReference?.editor?.selection) {
                    codeEditorReference.editor.textInput.focus()
                    setCodeEditorSelectionState(codeEditorReference)

                    if (editorState.selectionIsUnstable)
                        setEditorState(
                            {...editorState, selectionIsUnstable: false}
                        )
                } else if (richTextEditorInstance?.selection) {
                    richTextEditorInstance.focus(false)
                    setRichTextEditorSelectionState(richTextEditorInstance)

                    if (editorState.selectionIsUnstable)
                        setEditorState(
                            {...editorState, selectionIsUnstable: false}
                        )
                }
            } else if (inputReference.current) {
                ;(
                    inputReference.current as
                        HTMLInputElement|HTMLTextAreaElement
                ).setSelectionRange(
                    properties.cursor.start, properties.cursor.end
                )

                if (editorState.selectionIsUnstable)
                    setEditorState(
                        {...editorState, selectionIsUnstable: false}
                    )
            }
    })
    // endregion
    // region context helper
    // / region render helper
    /**
     * Applies icon preset configurations.
     * @param options - Icon options to extend of known preset identified.
     * @return Given potential extended icon configuration.
     */
    const applyIconPreset = (
        options?:Properties['icon']
    ):IconOptions|string|undefined => {
        if (options === 'clear_preset')
            return {
                icon: <GenericAnimate
                    in={properties.value !== properties.default}
                >
                    {(
                        UseAnimations === null ||
                        (UseAnimations as typeof Dummy).isDummy
                    ) ?
                        <IconButton icon="clear"/> :
                        <UseAnimations animation={plusToX} reverse={true}/>
                    }
                </GenericAnimate>,
                onClick: (event:ReactMouseEvent):void => {
                    event.preventDefault()
                    event.stopPropagation()

                    onChangeValue(transformValue<Type, Properties<Type>>(
                        properties,
                        properties.default as Type,
                        GenericInput.transformer as
                            InputDataTransformation<Type>
                    ))
                },
                strategy: 'component',
                tooltip: 'Clear input'
            }
        if (options === 'password_preset')
            return useMemorizedValue(
                {
                    icon: (
                        UseAnimations === null ||
                        (UseAnimations as typeof Dummy).isDummy
                    ) ?
                        <IconButton
                            icon={properties.hidden ? 'lock_open' : 'lock'}
                        /> :
                        <UseAnimations
                            animation={lock} reverse={!properties.hidden}
                        />,
                    onClick: (event:ReactMouseEvent):void => {
                        event.preventDefault()
                        event.stopPropagation()
                        setHidden((value:boolean|undefined):boolean => {
                            if (value === undefined)
                                value = properties.hidden
                            properties.hidden = !value
                            onChange(event)

                            return properties.hidden
                        })
                    },
                    strategy: 'component',
                    tooltip:
                        `${(properties.hidden ? 'Show' : 'Hide')} password`
                },
                properties.hidden
            )
        return options
    }
    /**
     * Derives native input type from given input property configuration.
     * @param properties - Input configuration to derive native input type
     * from.
     * @returns Determined input type.
     */
    const determineNativeType = (
        properties:Properties<Type>
    ):NativeInputType =>
        (
            properties.type === 'string' ?
                properties.hidden ?
                    'password' :
                    'text' :
                    transformer[properties.type]?.type ?? properties.type
        ) as NativeInputType
    /**
     * Render help or error texts with current validation state color.
     * @return Determined renderable markup specification.
     */
    const renderHelpText = ():ReactElement => <>
       <GenericAnimate in={
            properties.selectableEditor &&
            properties.type === 'string' &&
            properties.editor !== 'plain'
        }>
            <IconButton
                icon={{
                    icon: properties.editorIsActive ?
                        'subject' :
                        properties.editor.startsWith('code') ?
                            'code' :
                            'text_format',
                    onClick: onChangeEditorIsActive
                }}
            />
        </GenericAnimate>
        <GenericAnimate in={Boolean(properties.declaration)}>
            <IconButton
                icon={{
                    icon:
                        'more_' +
                        (properties.showDeclaration ? 'vert' : 'horiz'),
                    onClick: onChangeShowDeclaration
                }}
            />
        </GenericAnimate>
        <GenericAnimate in={properties.showDeclaration}>
            {properties.declaration}
        </GenericAnimate>
        <GenericAnimate in={
            !properties.showDeclaration &&
            properties.invalid &&
            (
                properties.showInitialValidationState ||
                /*
                    Material inputs show their validation state at
                    least after a blur event so we synchronize error
                    message appearances.
                */
                properties.visited
            )
        }>
            <Theme use="error">{renderMessage(
                properties.invalidMaximum &&
                properties.maximumText ||
                properties.invalidMaximumLength &&
                properties.maximumLengthText ||
                properties.invalidMinimum &&
                properties.minimumText ||
                properties.invalidMinimumLength &&
                properties.minimumLengthText ||
                properties.invalidInvertedPattern &&
                properties.invertedPatternText ||
                properties.invalidPattern &&
                properties.patternText ||
                properties.invalidRequired &&
                properties.requiredText
            )}</Theme>
        </GenericAnimate>
    </>
    /**
     * Renders given template string against all properties in current
     * instance.
     * @param template - Template to render.
     * @returns Evaluated template or an empty string if something goes wrong.
     */
    const renderMessage = (template?:any):string => {
        if (typeof template === 'string') {
            const evaluated:EvaluationResult = Tools.stringEvaluate(
                `\`${template}\``,
                 {
                     formatValue: (value:Type):string =>
                         formatValue<null|Type, Properties<Type>>(
                             properties, value, transformer
                         ),
                     ...properties
                }
            )
            if (evaluated.error) {
                console.warn(
                    'Given message template could not be proceed: ' +
                    evaluated.error
                )
                return ''
            }
            return evaluated.result
        }
        return ''
    }
    /**
     * Wraps given component with animation component if given condition holds.
     * @param content - Component or string to wrap.
     * @param propertiesOrInCondition - Animation properties or in condition
     * only.
     * @returns Wrapped component.
     */
    const wrapAnimationConditionally = (
        content:Renderable,
        propertiesOrInCondition:boolean|Partial<TransitionProps<HTMLElement|undefined>> =
            {},
        condition:boolean = true
    ):Renderable => {
        if (typeof propertiesOrInCondition === 'boolean')
            return condition ?
                <GenericAnimate in={propertiesOrInCondition}>
                    {content}
                </GenericAnimate> :
                propertiesOrInCondition ? content : ''
        return condition ?
            <GenericAnimate {...propertiesOrInCondition}>
                {content}
            </GenericAnimate> :
            propertiesOrInCondition.in ? content : ''
    }
    /**
     * If given icon options has an additional tooltip configuration integrate
     * a wrapping tooltip component into given configuration and remove initial
     * tooltip configuration.
     * @param options - Icon configuration potential extended a tooltip
     * configuration.
     * @returns Resolved icon configuration.
     */
    const wrapIconWithTooltip = (
        options?:Properties['icon']
    ):IconOptions|undefined => {
        if (typeof options === 'object' && options?.tooltip) {
            const tooltip:Properties['tooltip'] = options.tooltip
            options = {...options}
            delete options.tooltip
            const nestedOptions:IconOptions = {...options}
            options.strategy = 'component'
            options.icon = <WrapTooltip options={tooltip}>
                <Icon icon={nestedOptions} />
            </WrapTooltip>
        }
        return options as IconOptions|undefined
    }
    // / endregion
    // / region handle cursor selection state
    // // region rich-text editor
    /**
     * Determines absolute offset in given markup.
     * @param contentDomNode - Wrapping dom node where all content is
     * contained.
     * @param domNode - Dom node which contains given position.
     * @param offset - Relative position within given node.
     * @returns Determine absolute offset.
     */
    const determineAbsoluteSymbolOffsetFromHTML = (
        contentDomNode:Element, domNode:Element, offset:number
    ):number => {
        if (!properties.value)
            return 0

        const indicatorKey:string = 'generic-input-selection-indicator'
        const indicatorValue:string = '###'
        const indicator:string = ` ${indicatorKey}="${indicatorValue}"`

        domNode.setAttribute(indicatorKey, indicatorValue)
        // NOTE: TinyMCE seems to add a newline after each paragraph.
        const content:string = contentDomNode.innerHTML.replace(
            /(<\/p>)/gi, '$1\n'
        )
        domNode.removeAttribute(indicatorKey)

        const domNodeOffset:number = content.indexOf(indicator)
        const startIndex:number = domNodeOffset + indicator.length

        return (
            offset +
            content.indexOf('>', startIndex) +
            1 -
            indicator.length
        )
    }
    // // endregion
    // // region code editor
    /**
     * Determines absolute range from table oriented position.
     * @param column - Symbol offset in given row.
     * @param row - Offset row.
     * @returns Determined offset.
     */
    const determineAbsoluteSymbolOffsetFromTable = (
        column:number, row:number
    ):number => {
        if (typeof properties.value !== 'string' && !properties.value)
            return 0

        if (row > 0)
            return column + (properties.value as unknown as string)
                .split('\n')
                .slice(0, row)
                .map((line:string):number => 1 + line.length)
                .reduce((sum:number, value:number):number => sum + value)
        return column
    }
    /**
     * Converts absolute range into table oriented position.
     * @param offset - Absolute position.
     * @returns Position.
     */
    const determineTablePosition = (offset:number):{
        column:number
        row:number
    } => {
        const result = {column: 0, row: 0}
        if (typeof properties.value === 'string')
            for (const line of properties.value.split('\n')) {
                if (line.length < offset)
                    offset -= 1 + line.length
                else {
                    result.column = offset
                    break
                }
                result.row += 1
            }
        return result
    }
    /**
     * Sets current cursor selection range in given code editor instance.
     * @param instance - Code editor instance.
     * @returns Nothing.
     */
    const setCodeEditorSelectionState = (instance:CodeEditorType):void => {
        const range = instance.editor.selection.getRange()
        const endPosition = determineTablePosition(properties.cursor.end)
        range.setEnd(endPosition.row, endPosition.column)
        const startPosition = determineTablePosition(properties.cursor.start)
        range.setStart(startPosition.row, startPosition.column)
        instance.editor.selection.setRange(range)
    }
    /**
     * Sets current cursor selection range in given rich text editor instance.
     * @param instance - Code editor instance.
     * @returns Nothing.
     */
    const setRichTextEditorSelectionState = (instance:RichTextEditor):void => {
        const indicator:{
            end:string
            start:string
        } = {
            end: '###generic-input-selection-indicator-end###',
            start: '###generic-input-selection-indicator-start###'
        }
        const cursor:CursorState = {
            end: properties.cursor.end + indicator.start.length,
            start: properties.cursor.start
        }
        const keysSorted:Array<keyof typeof indicator> =
            ['start', 'end']

        let value:string = properties.representation
        for (const type of keysSorted)
            value = (
                value.substring(0, cursor[type as keyof typeof indicator]) +
                indicator[type] +
                value.substring(cursor[type as keyof typeof indicator])
            )
        instance.getBody().innerHTML = value

        const walker = document.createTreeWalker(
            instance.getBody(),
            NodeFilter.SHOW_TEXT,
            null,
            false
        )

        const range = instance.dom.createRng()
        const result:{
            end?:[Node, number]
            start?:[Node, number]
        } = {}
        let node
        while (node = walker.nextNode())
            for (const type of keysSorted) {
                if (node.nodeValue) {
                    const index:number =
                        node.nodeValue.indexOf(indicator[type])
                    if (index > -1) {
                        node.nodeValue = node.nodeValue.replace(
                            indicator[type], ''
                        )
                        result[type] = [node, index]
                    }
                }
            }

        for (const type of keysSorted)
            if (result[type])
                range[
                    `set${Tools.stringCapitalize(type)}` as 'setEnd'|'setStart'
                ](...(result[type] as [Node, number]))
        if (result.end && result.start)
            instance.selection.setRng(range)
    }
    // // endregion
    /**
     * Saves current selection/cursor state in components state.
     * @param event - Event which triggered selection change.
     * @returns Nothing.
     */
    const saveSelectionState = (event:GenericEvent):void => {
        /*
            NOTE: Known issues is that we do not get the absolute positions but
            the one in current selected node.
        */
        const codeEditorRange =
            codeEditorReference?.editor?.selection?.getRange()
        const richTextEditorRange =
            richTextEditorInstance?.selection?.getRng()
        const selectionEnd:null|number = (
            inputReference.current as HTMLInputElement|HTMLTextAreaElement
        )?.selectionEnd
        const selectionStart:null|number = (
            inputReference.current as HTMLInputElement|HTMLTextAreaElement
        )?.selectionStart
        if (codeEditorRange)
            setCursor({
                end: determineAbsoluteSymbolOffsetFromTable(
                    codeEditorRange.end.column,
                    typeof codeEditorRange.end.row === 'number' ?
                        codeEditorRange.end.row :
                        typeof properties.value === 'string' ?
                            properties.value.split('\n').length - 1 :
                            0
                ),
                start: determineAbsoluteSymbolOffsetFromTable(
                    codeEditorRange.start.column,
                    typeof codeEditorRange.start.row === 'number' ?
                        codeEditorRange.start.row :
                        typeof properties.value === 'string' ?
                            properties.value.split('\n').length - 1 :
                            0
                )
            })
        else if (richTextEditorRange)
            setCursor({
                end: determineAbsoluteSymbolOffsetFromHTML(
                    richTextEditorInstance!.getBody(),
                    richTextEditorInstance!.selection.getEnd(),
                    richTextEditorRange.endOffset
                ),
                start: determineAbsoluteSymbolOffsetFromHTML(
                    richTextEditorInstance!.getBody(),
                    richTextEditorInstance!.selection.getStart(),
                    richTextEditorRange.startOffset
                )
            })
        else if (
            typeof selectionEnd === 'number' &&
            typeof selectionStart === 'number'
        ) {
            const add:0|1|-1 =
                (event as unknown as KeyboardEvent)?.key?.length === 1 ?
                1 :
                (event as unknown as KeyboardEvent)?.key === 'Backspace' &&
                properties.representation.length > selectionStart ?
                    -1 :
                    0
            setCursor({end: selectionEnd + add, start: selectionStart + add})
        }
    }
    // / endregion
    // / region property aggregation
    const deriveMissingPropertiesFromState = () => {
        if (
            givenProperties.cursor === null ||
            typeof givenProperties.cursor !== 'object'
        )
            givenProperties.cursor = {} as CursorState
        if (givenProperties.cursor.end === undefined)
            givenProperties.cursor.end = cursor.end
        if (givenProperties.cursor.start === undefined)
            givenProperties.cursor.start = cursor.start

        if (givenProperties.editorIsActive === undefined)
            givenProperties.editorIsActive = editorState.editorIsActive

        if (givenProperties.hidden === undefined)
            givenProperties.hidden = hidden

        /*
            NOTE: This logic is important to re-determine representation when a
            new value is provided via properties.
        */
        if (givenProperties.representation === undefined)
            givenProperties.representation = valueState.representation

        if (givenProperties.showDeclaration === undefined)
            givenProperties.showDeclaration = showDeclaration

        deriveMissingBasePropertiesFromState<Props<Type>, ValueState<Type>>(
            givenProperties, valueState
        )

        if (givenProperties.value === undefined) {
            if (
                givenProperties.representation === undefined &&
                givenProperties.model!.value === undefined
            )
                givenProperties.representation = valueState.representation
        } else if (
            !representationControlled &&
            givenProperties.value !== valueState.value
        )
            /*
                NOTE: Set representation to "undefined" to trigger to derive
                current representation from current value.
            */
            givenProperties.representation = undefined
    }
    /**
     * Synchronizes property, state and model configuration:
     * Properties overwrites default properties which overwrites default model
     * properties.
     * @param properties - Properties to merge.
     * @returns Nothing.
    */
    const mapPropertiesAndValidationStateIntoModel = (
        properties:Props<Type>
    ):DefaultProperties => {
        const result:DefaultProperties =
            mapPropertiesIntoModel<Props<Type>, DefaultProperties>(
                properties,
                GenericInput.defaultProperties.model as Model<string>
            )

        ;(result.model.value as null|Type) =
            parseValue<null|Type, DefaultProperties>(
                result,
                result.model.value,
                transformer
            )

        determineValidationState(result, result.model.state)

        return result
    }
    /**
     * Calculate external properties (a set of all configurable properties).
     * @param properties - Properties to merge.
     * @returns External properties object.
     */
    const getConsolidatedProperties = (
        properties:Props<Type>
    ):Properties<Type> => {
        const result:Properties<Type> =
            getBaseConsolidatedProperties<Props<Type>, Properties<Type>>(
                mapPropertiesAndValidationStateIntoModel(properties) as
                    Props<Type>
            )

        if (!result.selection && result.type === 'boolean')
            // NOTE: Select-Fields restricts values to strings.
            result.selection = [
                {label: 'No', value: false as unknown as string},
                {label: 'Yes', value: true as unknown as string}
            ]

        // NOTE: If only an editor is specified it should be displayed.
        if (!(result.selectableEditor || result.editor === 'plain'))
            result.editorIsActive = true

        if (typeof result.representation !== 'string') {
            result.representation = formatValue<null|Type, Properties<Type>>(
                result,
                result.value as null|Type,
                transformer,
                /*
                    NOTE: Handle two cases:
                    1. Representation has to be determine initially
                       (-> usually no focus).
                    2. Representation was set from the outside
                       (-> usually no focus).
                */
                !result.focused
            )
            /*
                NOTE: We will try to restore last known selection state if
                representation has been modified.
            */
            if (
                result.focused &&
                result.representation !== result.value as unknown as string &&
                ['password', 'text'].includes(determineNativeType(result))
            )
                selectionIsUnstable = true
        }

        return result
    }
    // / endregion
    // / region reference setter
    /**
     * Set code editor references.
     * @param instance - Code editor instance.
     * @returns Nothing.
     */
    const setCodeEditorReference = (instance?:CodeEditorType):void => {
        codeEditorReference = instance

        if (codeEditorReference?.editor?.container?.querySelector('textarea'))
            codeEditorInputReference = {
                current: codeEditorReference.editor.container.querySelector(
                    'textarea'
                )
            }

        if (
            codeEditorReference &&
            properties.editorIsActive &&
            editorState.selectionIsUnstable
        ) {
            codeEditorReference.editor.textInput.focus()
            setCodeEditorSelectionState(codeEditorReference)
            setEditorState({...editorState, selectionIsUnstable: false})
        }
    }
    /**
     * Set rich text editor references.
     * @param instance - Editor instance.
     * @returns Nothing.
     */
    const setRichTextEditorReference = (instance?:RichTextEditorComponent):void => {
        richTextEditorReference = instance

        /*
            Refer inner element here is possible but marked as private.

            if (richTextEditorReference?.elementRef)
                richTextEditorInputReference =
                    richTextEditorReference.elementRef
        */
    }
    // / endregion
    // endregion
    // region event handler
    /**
     * Triggered on blur events.
     * @param event - Event object.
     * @returns Nothing.
     */
    const onBlur = (event:GenericEvent):void => setValueState((
        oldValueState:ValueState<Type, ModelState>
    ):ValueState<Type, ModelState> => {
        let changed:boolean = false
        let stateChanged:boolean = false

        if (oldValueState.modelState.focused) {
            properties.focused = false
            changed = true
            stateChanged = true
        }

        if (!oldValueState.modelState.visited) {
            properties.visited = true
            changed = true
            stateChanged = true
        }

        properties.value = transformValue<null|Type, Properties<Type>>(
            properties, properties.value as null|Type, transformer
        )
        properties.representation = formatValue<null|Type, Properties<Type>>(
            properties, properties.value as null|Type, transformer
        )

        if (
            oldValueState.value !== properties.value ||
            oldValueState.representation !== properties.representation
        )
            changed = true

        if (changed)
            onChange(event)

        if (oldValueState.value !== properties.value)
            triggerCallbackIfExists<Properties<Type>>(
                properties,
                'changeValue',
                controlled,
                properties.value,
                event,
                properties
            )

        if (stateChanged)
            triggerCallbackIfExists<Properties<Type>>(
                properties,
                'changeState',
                controlled,
                properties.model.state,
                event,
                properties
            )

        triggerCallbackIfExists<Properties<Type>>(
            properties, 'blur', controlled, event, properties
        )

        return changed ?
            {
                modelState: properties.model.state,
                representation: properties.representation,
                value: properties.value
            } :
            oldValueState
    })
    /**
     * Triggered on any change events. Consolidates properties object and
     * triggers given on change callbacks.
     * @param event - Potential event object.
     * @returns Nothing.
     */
    const onChange = (event?:GenericEvent):void => {
        Tools.extend(
            true,
            properties,
            getConsolidatedProperties(
                /*
                    Workaround since "Type" isn't identified as subset of
                    "RecursivePartial<Type>" yet.
                */
                properties as unknown as Props<Type>
            )
        )

        triggerCallbackIfExists<Properties<Type>>(
            properties, 'change', controlled, properties, event
        )
    }
    /**
     * Triggered when editor is active indicator should be changed.
     * @param event - Mouse event object.
     * @returns Nothing.
     */
    const onChangeEditorIsActive = (event?:ReactMouseEvent):void => {
        if (event) {
            event.preventDefault()
            event.stopPropagation()
        }

        setEditorState(({editorIsActive}):EditorState => {
            properties.editorIsActive = !editorIsActive

            onChange(event)

            triggerCallbackIfExists<Properties<Type>>(
                properties,
                'changeEditorIsActive',
                controlled,
                properties.editorIsActive,
                event,
                properties
            )

            return {
                editorIsActive: properties.editorIsActive,
                selectionIsUnstable: true
            }
        })
    }
    /**
     * Triggered when show declaration indicator should be changed.
     * @param event - Potential event object.
     * @returns Nothing.
     */
    const onChangeShowDeclaration = (event?:ReactMouseEvent):void => {
        if (event) {
            event.preventDefault()
            event.stopPropagation()
        }
        setShowDeclaration((value:boolean):boolean => {
            properties.showDeclaration = !value

            onChange(event)

            triggerCallbackIfExists<Properties<Type>>(
                properties,
                'changeShowDeclaration',
                controlled,
                properties.showDeclaration,
                event,
                properties
            )

            return properties.showDeclaration
        })
    }
    /**
     * Triggered when ever the value changes.
     * @param eventOrValue - Event object or new value.
     * @returns Nothing.
     */
    const onChangeValue = (
        eventOrValue:GenericEvent|null|Type, editorInstance?:RichTextEditor
    ):void => {
        if (properties.disabled)
            return

        let event:GenericEvent|undefined
        if (eventOrValue !== null && typeof eventOrValue === 'object') {
            const target:any =
                (eventOrValue as GenericEvent).target ||
                (eventOrValue as GenericEvent).detail
            if (target)
                properties.value = typeof target.value === 'undefined' ?
                    null :
                    target.value
            else
                properties.value = eventOrValue as null|Type
        } else
            properties.value = eventOrValue as null|Type

        setValueState((
            oldValueState:ValueState<Type, ModelState>
        ):ValueState<Type, ModelState> => {
            properties.representation = typeof properties.value === 'string' ?
                properties.value :
                formatValue<null|Type, Properties<Type>>(
                    properties, properties.value as null|Type, transformer
                )
            properties.value = parseValue<null|Type, Properties<Type>>(
                properties, properties.value, transformer
            )

            if (
                !representationControlled &&
                oldValueState.representation === properties.representation
            )
                /*
                    NOTE: No representation update and no controlled value or
                    representation:

                        -> No value update
                        -> No state update
                        -> Nothing to trigger
                */
                return oldValueState

            const result:ValueState<Type, ModelState> = {
                ...oldValueState, representation: properties.representation
            }

            if (!controlled && oldValueState.value === properties.value)
                /*
                    NOTE: No value update and no controlled value:

                        -> No state update
                        -> Nothing to trigger
                */
                return result

            result.value = properties.value

            let stateChanged:boolean = false

            if (oldValueState.modelState.pristine) {
                properties.dirty = true
                properties.pristine = false
                stateChanged = true
            }

            onChange(event)

            if (determineValidationState(
                properties as DefaultProperties, oldValueState.modelState
            ))
                stateChanged = true

            triggerCallbackIfExists<Properties<Type>>(
                properties,
                'changeValue',
                controlled,
                properties.value,
                event,
                properties
            )

            if (stateChanged) {
                result.modelState = properties.model.state

                triggerCallbackIfExists<Properties<Type>>(
                    properties,
                    'changeState',
                    controlled,
                    properties.model.state,
                    event,
                    properties
                )
            }

            return result
        })
    }
    /**
     * Triggered on click events.
     * @param event - Mouse event object.
     * @returns Nothing.
     */
    const onClick = (event:ReactMouseEvent):void => {
        onSelectionChange(event)

        triggerCallbackIfExists<Properties<Type>>(
            properties, 'click', controlled, event, properties
        )

        onTouch(event)
    }
    /**
     * Triggered on focus events.
     * @param event - Focus event object.
     * @returns Nothing.
     */
    const onFocus = (event:ReactFocusEvent):void => {
        triggerCallbackIfExists<Properties<Type>>(
            properties, 'focus', controlled, event, properties
        )

        onTouch(event)
    }
    /**
     * Triggered on down up events.
     * @param event - Key up event object.
     * @returns Nothing.
     */
    const onKeyDown = (event:ReactKeyboardEvent):void => {
        /*
            NOTE: We do not want to forward keydown enter events coming from
            textareas.
        */
        if (
            Tools.keyCode.ENTER === event.keyCode &&
            properties.type === 'string' &&
            properties.editor !== 'plain'
        )
            event.stopPropagation()

        triggerCallbackIfExists<Properties<Type>>(
            properties, 'keyDown', controlled, event, properties
        )
    }
    /**
     * Triggered on key up events.
     * @param event - Key up event object.
     * @returns Nothing.
     */
    const onKeyUp = (event:ReactKeyboardEvent):void => {
        // NOTE: Avoid breaking password-filler on non textarea fields!
        if (event.keyCode) {
            onSelectionChange(event)

            triggerCallbackIfExists<Properties<Type>>(
                properties, 'keyUp', controlled, event, properties
            )
        }
    }
    /**
     * Triggered on selection change events.
     * @param event - Event which triggered selection change.
     * @returns Nothing.
     */
    const onSelectionChange = (event:GenericEvent):void => {
        saveSelectionState(event)

        triggerCallbackIfExists<Properties<Type>>(
            properties, 'selectionChange', controlled, event, properties
        )
    }
    /**
     * Triggers on start interacting with the input.
     * @param event - Event object which triggered interaction.
     * @returns Nothing.
     */
    const onTouch = (event:ReactFocusEvent|ReactMouseEvent):void =>
        setValueState((
            oldValueState:ValueState<Type, ModelState>
        ):ValueState<Type, ModelState> => {
            let changedState:boolean = false

            if (!oldValueState.modelState.focused) {
                properties.focused = true
                changedState = true
            }

            if (oldValueState.modelState.untouched) {
                properties.touched = true
                properties.untouched = false
                changedState = true
            }

            let result:ValueState<Type, ModelState> = oldValueState

            if (changedState) {
                onChange(event)

                result = {...oldValueState, modelState: properties.model.state}

                triggerCallbackIfExists<Properties<Type>>(
                    properties,
                    'changeState',
                    controlled,
                    properties.model.state,
                    event,
                    properties
                )
            }

            triggerCallbackIfExists<Properties<Type>>(
                properties, 'touch', controlled, event, properties
            )

            return result
        })
    // endregion
    // region properties
    // / region references
    let codeEditorReference:CodeEditorType|undefined
    let codeEditorInputReference:RefObject<HTMLTextAreaElement> =
        createRef<HTMLTextAreaElement>()
    const foundationRef:RefObject<MDCSelectFoundation|MDCTextFieldFoundation> =
        createRef<MDCSelectFoundation|MDCTextFieldFoundation>()
    const inputReference:RefObject<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement> =
        createRef<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>()
    let richTextEditorInputReference:RefObject<HTMLTextAreaElement> =
        createRef<HTMLTextAreaElement>()
    let richTextEditorInstance:RichTextEditor|undefined
    let richTextEditorReference:RichTextEditorComponent|undefined
    // / endregion
    const givenProps:Props<Type> = translateKnownSymbols(props)

    const [cursor, setCursor] = useState<CursorState>({end: 0, start: 0})
    let [hidden, setHidden] = useState<boolean|undefined>()
    let [editorState, setEditorState] = useState<EditorState>({
        editorIsActive: false, selectionIsUnstable: false
    })
    let [showDeclaration, setShowDeclaration] = useState<boolean>(false)

    const initialValue:null|Type = determineInitialValue<Type>(
        givenProps,
        GenericInput.defaultProperties.model?.default as unknown as null|Type
    )
    /*
        NOTE: Extend default properties with given properties while letting
        default property object untouched for unchanged usage in other
        instances.
    */
    const givenProperties:Props<Type> = Tools.extend(
        true, Tools.copy(GenericInput.defaultProperties), givenProps
    )

    const type:string =
        givenProperties.type || givenProperties.model?.type || 'string'
    const transformer:InputDataTransformation<null|Type> =
        givenProperties.transformer ?
            {
                ...GenericInput.transformer,
                [type]: Tools.extend(
                    true,
                    Tools.copy(GenericInput.transformer[type]) || {},
                    givenProperties.transformer
                )
            } as InputDataTransformation<null|Type> :
            GenericInput.transformer as InputDataTransformation<null|Type>

    /*
        NOTE: This values have to share the same state item since they have to
        be updated in one event loop (set state callback).
    */
    let [valueState, setValueState] = useState<ValueState<Type, ModelState>>(
        () => ({
            modelState: {...GenericInput.defaultModelState},
            representation: determineInitialRepresentation<Type, Props<Type>>(
                givenProperties,
                GenericInput.defaultProperties as Props<Type>,
                initialValue,
                transformer
            ),
            value: initialValue
        })
    )

    /*
        NOTE: Sometimes we need real given properties or derived (default
        extended) "given" properties.
    */
    const controlled:boolean =
        !givenProperties.enforceUncontrolled &&
        (
            givenProps.model?.value !== undefined ||
            givenProps.value !== undefined
        ) &&
        Boolean(givenProps.onChange || givenProps.onChangeValue)
    const representationControlled:boolean =
        controlled && givenProps.representation !== undefined
    let selectionIsUnstable:boolean = false

    deriveMissingPropertiesFromState()

    const properties:Properties<Type> =
        getConsolidatedProperties(givenProperties)

    if (properties.hidden === undefined)
        properties.hidden = properties.name?.startsWith('password')
    // region synchronize properties into state where values are not controlled
    if (!Tools.equals(properties.cursor, cursor))
        setCursor(properties.cursor)
    if (properties.editorIsActive !== editorState.editorIsActive)
        setEditorState({
            ...editorState, editorIsActive: properties.editorIsActive
        })
    if (properties.hidden !== hidden)
        setHidden(properties.hidden)
    if (properties.showDeclaration !== showDeclaration)
        setShowDeclaration(properties.showDeclaration)

    const currentValueState:ValueState<Type, ModelState> = {
        modelState: properties.model.state,
        representation: properties.representation,
        value: properties.value!
    }
    /*
        NOTE: If value is controlled only trigger/save state changes when model
        state has changed.
    */
    if (
        !controlled &&
        (
            properties.value !== valueState.value ||
            properties.representation !== valueState.representation
        ) ||
        !Tools.equals(properties.model.state, valueState.modelState)
    )
        setValueState(currentValueState)
    if (controlled)
        setValueState = wrapStateSetter<ValueState<Type, ModelState>>(
            setValueState, currentValueState
        )
    // endregion
    useImperativeHandle(
        reference,
        ():AdapterWithReferences<Type> => {
            const state:State<Type> =
                {modelState: properties.model.state} as State<Type>

            for (const name of [
                'cursor', 'editorIsActive', 'hidden', 'showDeclaration'
            ] as const)
                if (!givenProps.hasOwnProperty(name))
                    (state[name] as boolean|CursorState) = properties[name]

            if (!representationControlled)
                state.representation = properties.representation
            if (!controlled)
                state.value = properties.value as null|Type

            return {
                properties,
                references: {
                    codeEditorReference,
                    codeEditorInputReference,
                    foundationRef,
                    inputReference,
                    richTextEditorInputReference,
                    richTextEditorInstance,
                    richTextEditorReference
                },
                state
            }
        }
    )
    // endregion
    // region render
    // / region intermediate render properties
    const genericProperties:Partial<CodeEditorProps|RichTextEditorProps|SelectProps|TextFieldProps> = {
        onBlur: onBlur,
        onFocus: onFocus,
        placeholder: properties.placeholder,
        value: properties.representation
    }
    const materialProperties:SelectProps|TextFieldProps = {
        disabled: properties.disabled,
        helpText: {
            children: renderHelpText(),
            persistent: Boolean(properties.declaration)
        },
        invalid: properties.showInitialValidationState && properties.invalid,
        label: properties.description || properties.name,
        outlined: properties.outlined,
        required: properties.required
    }
    if (properties.icon)
        materialProperties.icon = wrapIconWithTooltip(
            applyIconPreset(properties.icon) as IconOptions
        ) as IconOptions

    const tinyMCEOptions:TinyMCEOptions = {
        ...TINYMCE_DEFAULT_OPTIONS,
        content_style: properties.disabled ? 'body {opacity: .38}' : '',
        placeholder: properties.placeholder,
        readonly: Boolean(properties.disabled),
        setup: (instance:RichTextEditor):void => {
            richTextEditorInstance = instance
            richTextEditorInstance.on('init', ():void => {
                if (!richTextEditorInstance)
                    return

                richTextEditorLoadedOnce = true

                if (
                    properties.editorIsActive &&
                    editorState.selectionIsUnstable
                ) {
                    richTextEditorInstance.focus(false)
                    setRichTextEditorSelectionState(richTextEditorInstance)
                    setEditorState(
                        {...editorState, selectionIsUnstable: false}
                    )
                }
            })
        }
    }
    if (properties.editor.endsWith('raw)')) {
        tinyMCEOptions.toolbar1 =
            'cut copy paste | undo redo removeformat | code | fullscreen'
        delete tinyMCEOptions.toolbar2
    } else if (properties.editor.endsWith('simple)')) {
        tinyMCEOptions.toolbar1 =
            'cut copy paste | undo redo removeformat | bold italic ' +
            'underline strikethrough subscript superscript | fullscreen'
        delete tinyMCEOptions.toolbar2
    } else if (properties.editor.endsWith('normal)'))
        tinyMCEOptions.toolbar1 =
            'cut copy paste | undo redo removeformat | styleselect ' +
            'formatselect | searchreplace visualblocks fullscreen code'

    const isAdvancedEditor:boolean = (
        !properties.selection &&
        properties.type === 'string' &&
        properties.editorIsActive &&
        (
            properties.editor.startsWith('code') ||
            properties.editor.startsWith('richtext(')
        )
    )
    // / endregion
    // / region main markup
    return <WrapConfigurations
        strict={GenericInput.strict}
        themeConfiguration={properties.themeConfiguration}
        tooltip={properties.tooltip}
    ><div
        className={[styles['generic-input']]
            .concat(
                isAdvancedEditor ? styles['generic-input--custom'] : [],
                properties.className ?? []
            )
            .join(' ')
        }
        style={properties.style}
    >
        <GenericAnimate
            in={Boolean(properties.selection) || Boolean(properties.labels)}
        >
            <Select
                {...genericProperties as SelectProps}
                {...materialProperties as SelectProps}
                enhanced
                foundationRef={foundationRef as unknown as
                    RefCallback<MDCSelectFoundation>
                }
                inputRef={inputReference as unknown as
                    RefCallback<HTMLSelectElement|HTMLTextAreaElement>
                }
                rootProps={{
                    name: properties.name,
                    onClick: onClick,
                    ...properties.rootProps
                }}
                onChange={onChangeValue}
                options={normalizeSelection(
                    properties.selection, properties.labels
                ) as SelectProps['options']}
            />
        </GenericAnimate>
        {wrapAnimationConditionally(
            [
                <FormField
                    className={['mdc-text-field']
                        .concat(
                            properties.disabled ?
                                'mdc-text-field--disabled' :
                                [],
                            'mdc-text-field--textarea'
                        )
                        .join(' ')
                    }
                    key="advanced-editor-form-field"
                >
                    <label>
                        <span className={
                            [styles['generic-input__editor__label']]
                                .concat(
                                    'mdc-floating-label',
                                    'mdc-floating-label--float-above'
                                )
                                .join(' ')
                        }>
                            <Theme use={
                                properties.invalid &&
                                (
                                    properties.showInitialValidationState ||
                                    properties.visited
                                ) ? 'error' : undefined
                            }>
                                {properties.description || properties.name}{properties.required ? '*' : ''}
                            </Theme>
                        </span>
                        {
                            properties.editor.startsWith('code') ?
                                <Suspense fallback={
                                    <CircularProgress size="large" />
                                }>
                                    <CodeEditor
                                        {...genericProperties as
                                            CodeEditorProps
                                        }
                                        className="mdc-text-field__input"
                                        mode={(
                                            properties.editor.startsWith('code(') &&
                                            properties.editor.endsWith(')')
                                        ) ?
                                            properties.editor.substring(
                                                'code('.length,
                                                properties.editor.length - 1
                                            ) :
                                            'javascript'
                                        }
                                        name={properties.name}
                                        onChange={onChangeValue}
                                        onCursorChange={onSelectionChange}
                                        onSelectionChange={onSelectionChange}
                                        ref={setCodeEditorReference}
                                        setOptions={{
                                            maxLines: properties.rows,
                                            minLines: properties.rows,
                                            readOnly: properties.disabled,
                                            tabSize: 4,
                                            useWorker: false
                                        }}
                                        theme="github"
                                    />
                                </Suspense>
                            :
                                <RichTextEditorComponent
                                    {...genericProperties as
                                        RichTextEditorProps
                                    }
                                    disabled={properties.disabled}
                                    init={tinyMCEOptions}
                                    onClick={onClick as
                                        unknown as
                                        RichTextEventHandler<MouseEvent>
                                    }
                                    onEditorChange={onChangeValue as
                                        unknown as
                                        RichTextEditorProps['onEditorChange']
                                    }
                                    onKeyUp={onKeyUp as
                                        unknown as
                                        RichTextEventHandler<KeyboardEvent>
                                    }
                                    ref={setRichTextEditorReference as
                                        RefCallback<RichTextEditorComponent>
                                    }
                                    textareaName={properties.name}
                                    tinymceScriptSrc={`${TINYMCE_DEFAULT_OPTIONS.base_url}tinymce.min.js`}
                                />
                        }
                    </label>
                </FormField>,
                <div
                    className="mdc-text-field-helper-line"
                    key="advanced-editor-helper-line"
                >
                    <p className={
                        'mdc-text-field-helper-text' +
                        ' mdc-text-field-helper-text--persistent'
                    }>{(
                        materialProperties.helpText as {children:ReactElement}
                    ).children}</p>
                </div>
            ],
            isAdvancedEditor,
            richTextEditorLoadedOnce || properties.editor.startsWith('code')
        )}
        {wrapAnimationConditionally(
            <TextField
                {...genericProperties as TextFieldProps}
                {...materialProperties as TextFieldProps}
                {...(properties.type === 'number' ?
                    {
                        max: properties.maximum,
                        min: properties.minimum,
                        step: properties.step
                    } :
                    properties.type === 'string' ?
                        {
                            maxLength: properties.maximumLength >= 0 ?
                                properties.maximumLength :
                                Infinity,
                            minLength: properties.minimumLength >= 0 ?
                                properties.minimumLength :
                                0,
                            ...(properties.editor === 'plain' ?
                                {} :
                                {rows: properties.rows}
                            )
                        } :
                        ['date', 'datetime-local', 'time'].includes(
                            properties.type
                        ) ?
                            {
                                max: formatValue<null|Type, Properties<Type>>(
                                    properties,
                                    properties.maximum as unknown as Type,
                                    transformer
                                ),
                                min: formatValue<null|Type, Properties<Type>>(
                                    properties,
                                    properties.minimum as unknown as Type,
                                    transformer
                                ),
                                step: properties.step
                            } :
                            {}
                )}
                align={properties.align}
                characterCount
                foundationRef={foundationRef as unknown as
                    RefCallback<MDCTextFieldFoundation>
                }
                fullwidth={properties.fullWidth}
                inputRef={inputReference as unknown as
                    RefCallback<HTMLInputElement|HTMLTextAreaElement>
                }
                onChange={onChangeValue}
                ripple={properties.ripple}
                rootProps={{
                    name: properties.name,
                    onClick: onClick,
                    onKeyDown: onKeyDown,
                    onKeyUp: onKeyUp,
                    ...properties.rootProps
                }}
                textarea={
                    properties.type === 'string' &&
                    properties.editor !== 'plain'
                }
                trailingIcon={wrapIconWithTooltip(applyIconPreset(
                    properties.trailingIcon
                ))}
                type={determineNativeType(properties)}
            />,
            !(isAdvancedEditor || properties.selection || properties.labels),
            richTextEditorLoadedOnce || properties.editor.startsWith('code')
        )}
    </div></WrapConfigurations>
    // / endregion
    // endregion
} // TODO as ForwardRefRenderFunction<Adapter, Props>
// NOTE: This is useful in react dev tools.
GenericInputInner.displayName = 'GenericInput'
/**
 * Wrapping web component compatible react component.
 * @property static:defaultModelState - Initial model state.
 * @property static:defaultProperties - Initial property configuration.
 * @property static:locales - Defines input formatting locales.
 * @property static:propTypes - Triggers reacts runtime property value checks
 * @property static:strict - Indicates whether we should wrap render output in
 * reacts strict component.
 * @property static:transformer - Generic input data transformation
 * specifications.
 * @property static:wrapped - Wrapped component.
 *
 * @param props - Given components properties.
 * @param reference - Reference object to forward internal state.
 * @returns React elements.
 */
export const GenericInput:StaticComponent<
    unknown, Props, ModelState, DefaultProperties
> = memorize(forwardRef(GenericInputInner)) as
    unknown as
    StaticComponent<unknown, Props, ModelState, DefaultProperties>
// region static properties
// / region web-component hints
GenericInput.wrapped = GenericInputInner
GenericInput.webComponentAdapterWrapped = 'react'
// / endregion
GenericInput.defaultModelState = defaultModelState
/*
    NOTE: We set values to "undefined" to identify whether these values where
    provided via "props" and should shadow a state saved valued.
*/
GenericInput.defaultProperties = {
    ...defaultProperties,
    cursor: undefined,
    model: {
        ...defaultProperties.model,
        // Trigger initial determination.
        state: undefined as unknown as ModelState,
        value: undefined
    },
    representation: undefined,
    value: undefined
}
GenericInput.locales = Tools.locales
GenericInput.propTypes = propertyTypes
GenericInput.strict = false
GenericInput.transformer = {
    boolean: {
        parse: (value:string):any => (
            value === 'true' ? true : value === 'false' ? false : value
        ),
        type: 'text'
    },
    currency: {
        format: {final: {
            options: {currency: 'USD'},
            transform: (
                value:number,
                configuration:Properties,
                transformer:InputDataTransformation
            ):string => {
                const currency:string =
                    transformer.currency.format.final.options!.currency as
                        string

                return value === Infinity ?
                    `Infinity ${currency}` :
                    value === -Infinity ?
                        `- Infinity ${currency}` :
                        (new Intl.NumberFormat(
                            GenericInput.locales,
                            {
                                style: 'currency',
                                ...transformer.currency.format.final.options
                            }
                        )).format(value)
            }
        }},
        parse: (
            value:string,
            configuration:Properties,
            transformer:InputDataTransformation
        ):any =>
            transformer.float.parse(value, configuration, transformer),
        type: 'text'
    },
    date: {
        format: {
            final: {transform: (value:number|string):string => {
                value = typeof value === 'number' ? value : parseFloat(value)

                if (value === Infinity)
                    return 'infinitely far in the future'
                if (value === -Infinity)
                    return 'infinitely early in the past'
                if (!isFinite(value))
                    return ''

                const formattedValue:string =
                    (new Date(Math.round((value as number) * 1000)))
                        .toISOString()

                return formattedValue.substring(0, formattedValue.indexOf('T'))
            }},
            intermediate: {transform: (
                value:number|string,
                configuration:Properties,
                transformer:InputDataTransformation
            ):string =>
                transformer.date.format.final.transform(
                    value, configuration, transformer
                )
            }
        },
        parse: (value:number|string):number => typeof value === 'number' ?
            value :
            `${parseFloat(value)}` === value ?
                parseFloat(value) :
                Date.parse(value) / 1000
    },
    // TODO respect local to utc conversion.
    'datetime-local': {
        format: {
            final: {transform: (value:number):string => {
                value = typeof value === 'number' ? value : parseFloat(value)

                if (value === Infinity)
                    return 'infinitely far in the future'
                if (value === -Infinity)
                    return 'infinitely early in the past'
                if (!isFinite(value))
                    return ''

                const formattedValue:string =
                    (new Date(Math.round((value as number) * 1000)))
                        .toISOString()

                return formattedValue.substring(0, formattedValue.length - 1)
            }},
            intermediate: {transform: (
                value:number|string,
                configuration:Properties,
                transformer:InputDataTransformation
            ):string =>
                transformer['datetime-local'].format.final.transform(
                    value, configuration, transformer
                )
            }
        },
        parse: (
            value:number|string,
            configuration:Properties<number>,
            transformer:InputDataTransformation<number>
        ):number =>
            transformer.date.parse(value, configuration, transformer)
    },
    float: {
        format: {final: {transform: (
            value:number,
            configuration:Properties,
            transformer:InputDataTransformation
        ):string =>
            value === Infinity ? 'Infinity' : value === -Infinity ?
                '- Infinity' :
                (new Intl.NumberFormat(
                    GenericInput.locales,
                    transformer.float.format.final.options || {}
                )).format(value)
        }},
        parse: (value:number|string, configuration:Properties):number => {
            if (typeof value === 'string')
                value = parseFloat(
                    GenericInput.locales[0] === 'de-DE' ?
                        value.replace(/\./g, '').replace(/\,/g, '.') :
                        value
                )

            // Fix sign if possible.
            if (
                typeof value === 'number' &&
                (
                    typeof configuration.minimum === 'number' &&
                    configuration.minimum >= 0 &&
                    value < 0 ||
                    typeof configuration.maximum === 'number' &&
                    configuration.maximum <= 0 &&
                    value > 0
                )
            )
                value *= -1

            return value
        },
        type: 'text'
    },
    integer: {
        format: {final: {transform: (
            value:number,
            configuration:Properties,
            transformer:InputDataTransformation
        ):string => (
            new Intl.NumberFormat(
                GenericInput.locales,
                {
                    maximumFractionDigits: 0,
                    ...(transformer.integer.format.final.options || {})
                }
            )).format(value)
        }},
        parse: (value:number|string, configuration:Properties):any => {
            if (typeof value === 'string')
                value = parseInt(
                    GenericInput.locales[0] === 'de-DE' ?
                        value.replace(/[,.]/g, '') :
                        value
                )

            // Fix sign if possible.
            if (
                typeof value === 'number' &&
                (
                    typeof configuration.minimum === 'number' &&
                    configuration.minimum >= 0 &&
                    value < 0 ||
                    typeof configuration.maximum === 'number' &&
                    configuration.maximum <= 0 &&
                    value > 0
                )
            )
                value *= -1

            return value
        },
        type: 'text'
    },
    number: {parse: (value:number|string):number =>
        typeof value === 'number' ? value : parseInt(value)
    },
    time: {
        format: {
            final: {transform: (value:number):string => {
                value = typeof value === 'number' ? value : parseFloat(value)

                if (value === Infinity)
                    return 'infinitely far in the future'
                if (value === -Infinity)
                    return 'infinitely early in the past'
                if (!isFinite(value))
                    return ''

                const formattedValue:string =
                    (new Date(Math.round((value as number) * 1000)))
                        .toISOString()

                return formattedValue.substring(
                    formattedValue.indexOf('T') + 1, formattedValue.length - 1
                )
            }},
            intermediate: {transform: (
                value:number|string,
                configuration:Properties,
                transformer:InputDataTransformation
            ):string => transformer.time.format.final.transform(
                value, configuration, transformer
            )}
        },
        parse: (value:number|string):number => typeof value === 'number' ?
            value :
            parseInt(value.replace(
                /^([0-9]{2}):([0-9]{2})$/,
                (_:string, hour:string, minute:string):string =>
                    String(parseInt(hour) * 60 ** 2 + parseInt(minute) * 60)
            ))
    },
} as InputDataTransformation
// endregion
export default GenericInput
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion
