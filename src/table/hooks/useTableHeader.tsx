import { SetupContext, computed } from '@vue/composition-api';
import isString from 'lodash/isString';
import isFunction from 'lodash/isFunction';
import { CreateElement } from 'vue';
import { prefix } from '../../config';
import { BaseTableCol, TdBaseTableProps } from '../type';
import { RowAndColFixedPosition, getColumnFixedStyles } from './useFixed';
import { formatCSSUnit } from './useStyle';
import { TableColums, getThRowspanAndColspan, getThList } from './useMultiHeader';
import useClassName from './useClassName';
import { TNodeReturnValue } from '../../common';

export interface RenderTableHeaderParams {
  // 是否固定表头
  isFixedHeader: boolean;
  // 固定列 left/right 具体值
  rowAndColFixedPosition: RowAndColFixedPosition;
}

// 渲染表头的通用方法
export function renderTitle(h: CreateElement, slots: SetupContext['slots'], col: TableColums[0], index: number) {
  const params = { col, colIndex: index };
  if (isFunction(col.title)) {
    return col.title(h, params);
  }
  if (isString(col.title) && slots[col.title]) {
    return slots[col.title](params);
  }
  if (isFunction(col.render)) {
    return col.render(h, {
      ...params,
      type: 'title',
      row: {},
      rowIndex: -1,
    });
  }
  return col.title;
}

export default function useTableHeader(props: TdBaseTableProps, context: SetupContext) {
  const {
    tableSortClasses, tableFilterClasses, tableHeaderClasses, tableBaseClass, tableColFixedClasses,
  } = useClassName();
  // 一次性获取 colspan 和 rowspan 可以避免其他数据更新导致的重复计算
  const spansAndLeafNodes = computed(() => getThRowspanAndColspan(props.columns));
  // 表头二维数据
  const thList = computed(() => getThList(props.columns));
  const isMultipleHeader = computed(() => thList.value.length > 1);

  // eslint-disable-next-line
  const renderColgroup = (h: CreateElement, columns: BaseTableCol[]) => (
    <colgroup>
      {columns.map((col) => (
        <col style={{ width: formatCSSUnit(col.width) }}></col>
      ))}
    </colgroup>
  );

  // eslint-disable-next-line
  const renderThNodeList = (h: CreateElement, rowAndColFixedPosition: RowAndColFixedPosition) => {
    // thBorderMap: rowspan 会影响 tr > th 是否为第一列表头，从而影响边框
    const thBorderMap = new Map<any, boolean>();
    const thRowspanAndColspan = spansAndLeafNodes.value.rowspanAndColspanMap;
    return thList.value.map((row, rowIndex) => {
      const thRow = row.map((col: TableColums[0], index: number) => {
        const rospanAndColspan = thRowspanAndColspan.get(col);
        if (index === 0 && rospanAndColspan.rowspan > 1) {
          for (let j = rowIndex + 1; j < rowIndex + rospanAndColspan.rowspan; j++) {
            thBorderMap.set(thList.value[j][0], true);
          }
        }
        const thStyles = getColumnFixedStyles(col, index, rowAndColFixedPosition, tableColFixedClasses);
        const colParams = {
          col,
          colIndex: index,
          row: {},
          rowIndex: -1,
        };
        const customClasses = isFunction(col.className) ? col.className({ ...colParams, type: 'th' }) : col.className;
        const thClasses = [
          thStyles.classes,
          customClasses,
          {
            // 受 rowspan 影响，部分 tr > th:first-child 需要补足左边框
            [tableHeaderClasses.thBordered]: thBorderMap.get(col),
            [`${prefix}-table__th-${col.colKey}`]: col.colKey,
          },
        ];
        return (
          <th data-colkey={col.colKey} class={thClasses} style={thStyles.style} attrs={{ ...rospanAndColspan }}>
            {renderTitle(h, context.slots, col, index)}
          </th>
        );
      });
      return <tr>{thRow}</tr>;
    });
  };

  // eslint-disable-next-line
  const renderTableHeader = (h: CreateElement, { isFixedHeader, rowAndColFixedPosition }: RenderTableHeaderParams) => {
    const theadClasses = [
      tableHeaderClasses.header,
      {
        [tableHeaderClasses.fixed]: isFixedHeader,
        [tableBaseClass.bordered]: props.bordered && isMultipleHeader.value,
        [tableHeaderClasses.multipleHeader]: isMultipleHeader.value,
      },
    ];
    return (
      <thead ref="theadRef" class={theadClasses}>
        {renderThNodeList(h, rowAndColFixedPosition)}
      </thead>
    );
  };

  // eslint-disable-next-line
  const renderTitleWidthIcon = (h: CreateElement, [title, sortIcon, filterIcon]: TNodeReturnValue[]) => {
    const classes = {
      [tableSortClasses.sortable]: sortIcon,
      [tableFilterClasses.filterable]: filterIcon,
    };
    return (
      <div class={classes}>
        <div class={tableSortClasses.title}>
          <div>{title}</div>
          {Boolean(sortIcon || filterIcon) && (
            <span>
              {sortIcon}
              {filterIcon}
            </span>
          )}
        </div>
      </div>
    );
  };

  return {
    thList,
    isMultipleHeader,
    spansAndLeafNodes,
    renderColgroup,
    renderTableHeader,
    renderTitleWidthIcon,
  };
}
