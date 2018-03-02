import {NgModule,Component,ElementRef,OnInit,AfterContentInit,DoCheck,OnDestroy,Input,Output,SimpleChange,EventEmitter,ContentChild,ContentChildren,QueryList,TemplateRef} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import { ObjectUtils } from '../utils/objectutils';
import {Header,Footer,PrimeTemplate,SharedModule} from '../common/shared';
import {PaginatorModule} from '../paginator/paginator';
import {DropdownModule} from '../dropdown/dropdown';
import {BlockableUI} from '../common/blockableui';
import {SelectItem} from '../common/selectitem';

@Component({
    selector: 'p-dataView',
    template: `
        <div [ngClass]="{'ui-dataview ui-widget': true, 'ui-dataview-list': (layout === 'list'), 'ui-dataview-grid': (layout === 'grid')}" [ngStyle]="style" [class]="styleClass">
            <div class="ui-dataview-header ui-widget-header ui-corner-top">
                <ng-content select="p-header"></ng-content>
            </div>
            <p-paginator [rows]="rows" [first]="first" [totalRecords]="totalRecords" [pageLinkSize]="pageLinks" [alwaysShow]="alwaysShowPaginator"
                (onPageChange)="paginate($event)" styleClass="ui-paginator-top" [rowsPerPageOptions]="rowsPerPageOptions" *ngIf="paginator && (paginatorPosition === 'top' || paginatorPosition =='both')"
                [dropdownAppendTo]="paginatorDropdownAppendTo"></p-paginator>
            <div class="ui-dataview-content ui-widget-content">
                <div class="ui-g">
                    <ng-template ngFor let-rowData let-rowIndex="index" [ngForOf]="paginator ? ((filteredValue||value) | slice:(lazy ? 0 : first):((lazy ? 0 : first) + rows)) : (filteredValue||value)" [ngForTrackBy]="trackBy">
                        <ng-container *ngTemplateOutlet="itemTemplate; context: {$implicit: rowData, rowIndex: rowIndex}"></ng-container>
                    </ng-template>
                    <div *ngIf="isEmpty()" class="ui-widget-content ui-g-12">{{emptyMessage}}</div>
                </div>
            </div>
            <p-paginator [rows]="rows" [first]="first" [totalRecords]="totalRecords" [pageLinkSize]="pageLinks" [alwaysShow]="alwaysShowPaginator"
                (onPageChange)="paginate($event)" styleClass="ui-paginator-bottom" [rowsPerPageOptions]="rowsPerPageOptions" *ngIf="paginator && (paginatorPosition === 'bottom' || paginatorPosition =='both')"
                [dropdownAppendTo]="paginatorDropdownAppendTo"></p-paginator>
            <div class="ui-dataview-footer ui-widget-header ui-corner-bottom" *ngIf="footer">
                <ng-content select="p-footer"></ng-content>
            </div>
        </div>
    `,
    providers: [ObjectUtils]
})
export class DataView implements OnInit,AfterContentInit,BlockableUI {

    @Input() layout: string = 'list';

    @Input() paginator: boolean;

    @Input() rows: number;
    
    @Input() totalRecords: number;

    @Input() pageLinks: number = 5;
    
    @Input() rowsPerPageOptions: number[];

    @Input() lazy: boolean;

    @Input() emptyMessage: string = 'No records found';
    
    @Output() onLazyLoad: EventEmitter<any> = new EventEmitter();

    @Input() style: any;

    @Input() styleClass: string;
    
    @Input() paginatorPosition: string = 'bottom';
    
    @Input() alwaysShowPaginator: boolean = true;
    
    @Input() trackBy: Function = (index: number, item: any) => item;
    
    @Input() paginatorDropdownAppendTo: any;
    
    @Output() onPage: EventEmitter<any> = new EventEmitter();
    
    @ContentChild(Header) header;

    @ContentChild(Footer) footer;
    
    @ContentChildren(PrimeTemplate) templates: QueryList<any>;
    
    _value: any[];
    
    listItemTemplate: TemplateRef<any>;

    gridItemTemplate: TemplateRef<any>;

    itemTemplate: TemplateRef<any>;

    first: number = 0;
    
    filteredValue: any[];

    _sortField: string;

    _sortOrder: number = 1;

    initialized: boolean;
    
    constructor(public el: ElementRef, public objectUtils: ObjectUtils) {}

    ngOnInit() {
        if(this.lazy) {
            this.onLazyLoad.emit(this.createLazyLoadMetadata());
        }
        this.initialized = true;
    }

    @Input() get sortField(): string {
        return this._sortField;
    }

    set sortField(val: string) {
        this._sortField = val;

        //avoid triggering lazy load prior to lazy initialization at onInit
        if ( !this.lazy || this.initialized ) {
            this.sort();
        }
    }

    @Input() get sortOrder(): number {
        return this._sortOrder;
    }
    set sortOrder(val: number) {
        this._sortOrder = val;

         //avoid triggering lazy load prior to lazy initialization at onInit
        if ( !this.lazy || this.initialized ) {
            this.sort();
        }
    }
    
    ngAfterContentInit() {
        this.templates.forEach((item) => {
            switch(item.getType()) {
                case 'listItem':
                    this.listItemTemplate = item.template;
                break;
                
                case 'gridItem':
                    this.gridItemTemplate = item.template;
                break;
            }
        });

        this.updateItemTemplate();
    }

    updateItemTemplate() {
        switch(this.layout) {
            case 'list':
                this.itemTemplate = this.listItemTemplate;
            break;
            
            case 'grid':
                this.itemTemplate = this.gridItemTemplate;
            break;
        }
    }
    
    @Input() get value(): any[] {
        return this._value;
    }

    set value(val:any[]) {
        this._value = val;
        this.updateTotalRecords();
    }

    changeLayout(layout: string) {
        this.layout = layout;
        this.updateItemTemplate();
    }
        
    updateTotalRecords() {
        this.totalRecords = this.lazy ? this.totalRecords : (this._value ? this._value.length : 0);
    }

    paginate(event) {
        this.first = event.first;
        this.rows = event.rows;

        if (this.lazy) {
            this.onLazyLoad.emit(this.createLazyLoadMetadata());
        }

        this.onPage.emit({
            first: this.first,
            rows: this.rows,
            sortField: this.sortField,
            sortOrder: this.sortOrder
        });
    }

    sort() {
        this.first = 0;

        if(this.lazy) {
            this.onLazyLoad.emit(this.createLazyLoadMetadata());
        }
        else if (this.value) {
            this.value.sort((data1, data2) => {
                let value1 = this.objectUtils.resolveFieldData(data1, this.sortField);
                let value2 = this.objectUtils.resolveFieldData(data2, this.sortField);
                let result = null;

                if (value1 == null && value2 != null)
                    result = -1;
                else if (value1 != null && value2 == null)
                    result = 1;
                else if (value1 == null && value2 == null)
                    result = 0;
                else if (typeof value1 === 'string' && typeof value2 === 'string')
                    result = value1.localeCompare(value2);
                else
                    result = (value1 < value2) ? -1 : (value1 > value2) ? 1 : 0;

                return (this.sortOrder * result);
            });
        }
    }

    isEmpty() {
        let data = this.filteredValue||this.value;
        return data == null || data.length == 0;
    }
    
    createLazyLoadMetadata(): any {
        return {
            first: this.first,
            rows: this.rows
        };
    }
    
    getBlockableElement(): HTMLElement {
        return this.el.nativeElement.children[0];
    }
}

@Component({
    selector: 'p-dataViewLayoutOptions',
    template: `
        <div [ngClass]="'ui-dataview-layout-options ui-selectbutton ui-buttonset'" [ngStyle]="style" [class]="styleClass">
            <a href="#" class="ui-button ui-button-icon-only ui-state-default" (click)="changeLayout($event, 'list')"
                [ngClass]="{'ui-state-active': dv.layout === 'list'}">
                <i class="fa fa-bars ui-button-icon-left"></i>
                <span class="ui-button-text ui-clickable">ui-btn</span>
            </a><a href="#" class="ui-button ui-button-icon-only ui-state-default" (click)="changeLayout($event, 'grid')"
                [ngClass]="{'ui-state-active': dv.layout === 'grid'}">
                <i class="fa fa-th-large ui-button-icon-left"></i>
                <span class="ui-button-text ui-clickable">ui-btn</span>
            </a>
        </div>
    `
})
export class DataViewLayoutOptions  {

    @Input() style: any;

    @Input() styleClass: string;

    constructor(public dv: DataView) {}

    changeLayout(event: Event, layout: string) {
        this.dv.changeLayout(layout);
        event.preventDefault();
    }
}

@Component({
    selector: 'p-dataViewSortDropdown',
    template: `
        <p-dropdown [options]="options" [(ngModel)]="value" [style]="style" [styleClass]="styleClass"
            (onChange)="onChange($event)" [lazy]="false" [appendTo]="appendTo" [placeholder]="placeholder"></p-dropdown>
    `
})
export class DataViewSortDropdown {

    @Input() style: any;

    @Input() styleClass: string;

    @Input() appendTo: any;

    @Input() options: SelectItem[];

    @Input() placeholder: string;

    value: string;

    constructor(public dv: DataView) {}

    onChange(event) {
        let value = event.value;
        let field;
        let order;

        if (value.indexOf('!') === 0) {
            order = -1;
            field = value.substring(1, value.length);
        }
        else {
            order = 1;
            field = value;
        }

        this.dv._sortField = field;
        this.dv._sortOrder = order;
        this.dv.sort();
    }
}

@NgModule({
    imports: [CommonModule,SharedModule,PaginatorModule,FormsModule],
    exports: [DataView,SharedModule,DataViewLayoutOptions,FormsModule,DataViewSortDropdown],
    declarations: [DataView,DataViewLayoutOptions,DataViewSortDropdown]
})
export class DataViewModule { }
