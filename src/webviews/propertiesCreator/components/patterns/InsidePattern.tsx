/* eslint-disable @typescript-eslint/naming-convention */
import * as React from 'react';
import Card from '../UI/Card';
import Selector from '../UI/Selector';

function InsidePattern(props:{name:string, elements:any[]}) {
    return (
        <Card>
          Choose between the patterns present in {props.name}:
          {props.elements.map((el) => (
            <Selector key={el.name} title={el.name} info={el.info} tab={el.name.toLowerCase()} />
          ))}
        </Card>
      );
}

export default InsidePattern;