// #!/usr/bin/env babel-node
// -*- coding: utf-8 -*-
'use strict'
/* !
    region header
    Copyright Torben Sickert (info["~at~"]torben.website) 16.12.2012

    License
    -------

    This library written by Torben Sickert stand under a creative commons
    naming 3.0 unported license.
    See https://creativecommons.org/licenses/by/3.0/deed.de
    endregion
*/
// region imports
import {describe, expect, test} from '@jest/globals'
import {createRef, RefObject} from 'react'

import GenericAnimate from '../components/GenericAnimate'
// endregion
describe('GenericAnimate', ():void => {
    test('render', ():void => {
        const reference:RefObject<unknown> = createRef()

        expect(GenericAnimate.wrapped!({children: <div/>}, reference))
            .toHaveProperty('props.in', true)
        expect(
            GenericAnimate.wrapped!({children: <div/>, in: false}, reference)
        ).toHaveProperty('props.in', false)
    })
})
// region vim modline
// vim: set tabstop=4 shiftwidth=4 expandtab:
// vim: foldmethod=marker foldmarker=region,endregion:
// endregion
