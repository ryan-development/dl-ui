import { inject, bindable, containerless, computedFrom, BindingEngine } from 'aurelia-framework'
import { Service, CoreService } from './service';
import moment from 'moment';

var LotLoader = require('../../../../loader/lot-configuration-loader');
var MaterialTypeLoader = require('../../../../loader/material-types-loader');
var UnitLoader = require('../../../../loader/unit-loader');
var MachineSpinningLoader = require('../../../../loader/machine-spinning-for-blowing-loader');

@inject(Service, CoreService)
export class DataForm {
    @bindable isCreate = false;
    @bindable isEdit = false;
    @bindable isView = false;
    @bindable title;
    @bindable readOnly;
    @bindable processType = "Blowing";
    @bindable inputDate;
    @bindable materialType;
    @bindable lot;
    @bindable shift;
    @bindable group;
    @bindable unit;
    @bindable isItem = false;
    @bindable detailOptions;
    @bindable error;
    @bindable machineSpinning;
    @bindable machineName;
    @bindable details1 = [];
    @bindable details2 = [];
    @bindable details3 = [];
    @bindable details4 = [];

    formOptions = {
        cancelText: "Kembali",
        saveText: "Simpan",
        deleteText: "Hapus",
        editText: "Ubah",
    };
    typeOptions = []
    processTypeList = [
        "",
        "Blowing",
        "Carding",
        "Pre-Drawing",
        "Finish Drawing",
        "Flyer",
        "Ring Spinning",
        "Winder"
    ];

    get filters() {
        var filters = {
            isEdit: this.context.isEdit,
        }
    }

    shiftList = ["", "Shift I: 06.00 – 14.00", "Shift II: 14.00 – 22.00", "Shift III: 22:00 – 06.00"];
    detailOptions = {

    };
    itemsColumnsHeader = [
        "Output (Counter)",
        "UOM"
    ];
    machineSpinningFilter = {};
    masterFilter = {};
    lotFilter = {};
    controlOptions = {
        label: {
            length: 4,
        },
        control: {
            length: 4,
        }
    };

    items = [];
    spinningFilter = { "DivisionName.toUpper()": "SPINNING" };
    machineSpinningFilter = {};
    constructor(service, coreService) {
        this.service = service;
        this.coreService = coreService;

    }

    bind(context) {

        this.context = context;
        this.data = this.context.data;
        this.error = this.context.error;

        this.data.ProcessType = this.processType;
        this.detailOptions.ProcessType = this.processType;
        this.coreService.getMachineTypes()
            .then(result => {
                if (this.data.ProcessType) {
                    this.typeOptions = result;
                } else {
                    this.typeOptions.push("");
                    for (var list of result) {
                        this.typeOptions.push(list);
                    }
                }
            });




        this.detailOptions.isEdit = this.context.isEdit;
        if (this.data.UnitDepartment && this.data.UnitDepartment.Id) {
            this.unit = this.data.UnitDepartment;
        }
        if (this.data.Lot && this.data.Lot.Id) {
            this.lot = this.data.Lot;
        }
        if (this.data.ProcessType) {
            this.processType = this.data.ProcessType;
        }

        if (this.data.MaterialType && this.data.MaterialType.Id) {
            this.materialType = {};
            this.materialType.Id = this.data.MaterialType.Id;
            this.materialType.Name = this.data.MaterialType.Name;
            this.materialType.Code = this.data.MaterialType.Code;
        }

        if (this.data.Date) {
            this.inputDate = this.data.Date;
        }

        if (this.data.Shift) {
            this.shift = this.data.Shift;
        }

        if (this.data.Group) {
            this.group = this.data.Group;
        }

        if (this.data.Items) {
            this.data.Items[0].Identity = this.data.Items[0].Id;
            this.data.Items[0].MachineSpinningIdentity = this.data.Items[0].MachineSpinning.Id;
            this.coreService.getMachineSpinningById(this.data.Items[0].MachineSpinning.Id)
                .then(result => {
                    this.machineSpinning = result;
                });
        }
    }

    items = {
        columns: [
            "Nomor Mesin",
            "Nama Mesin",
            "Output (Counter)",
            "UOM",
            "Bale",
            "Total Delivery",
            "Spindle Kosong (Flyer)",
            "Bad Cone (Winder)",
            "Eff%"],
        onRemove: function () {
            this.context.machineCollections.bind();

        }.bind(this)
    };

    async fillItems() {
        if (this.data.UnitDepartmentId && this.data.MaterialTypeId && this.data.LotId && this.machineSpinning) {
            this.isItem = true;
            this.detailOptions.UomUnit = this.machineSpinning.UomUnit;

            this.detailOptions.CountConfig = await this.service.getCountByProcessAndYarn(this.data.ProcessType, this.data.MaterialTypeId);
            if (!this.detailOptions.CountConfig) {
                if (this.error) {
                    this.error.LotId = "Count is not created with this Lot";
                }

            } else {
                if (this.error) {
                    this.error.LotId = undefined;
                }
            }

            if (this.data.Items) {
                this.details1 = this.data.Items[0].BlowingDetails.slice(0, 25)
                this.details2 = this.data.Items[0].BlowingDetails.slice(25, 50);
                this.details3 = this.data.Items[0].BlowingDetails.slice(50, 75);
                this.details4 = this.data.Items[0].BlowingDetails.slice(75);

                this.data.Items[0].MachineSpinningIdentity = this.machineSpinning.Id;
                this.data.Items[0].BlowingDetails = this.details1.concat(this.details2, this.details3, this.details4);
                this.data.Items[0].Output = this.data.Items[0].BlowingDetails.reduce((a, b) => +a + +b.Output, 0);
                if (this.machineSpinning.UomUnit.toUpperCase() == "KG") {
                    this.data.Items[0].Bale = (this.data.Items[0].Output / 181.44) * this.machineSpinning.Delivery;
                } else {
                    this.data.Items[0].Bale = this.data.Items[0].Output;
                }
                this.data.Items[0].Eff = this.data.Items[0].Bale * 100 / ((this.detailOptions.CountConfig.RPM * 345.6 * (22 / 7) * this.machineSpinning.Delivery) / (this.detailOptions.CountConfig.Ne * 307200)); // 60 * 24 * 0.24 & 400 * 768
                this.data.MachineSpinning = this.machineSpinning;
                this.data.CountConfig = this.detailOptions.CountConfig

            } else {
                this.data.Items = [];
                for (let i = 1; i <= 100; i++) {
                    let blowDet = {};
                    blowDet.Number = i;
                    if (i <= 25) {
                        this.details1.push(blowDet);
                    } else if (i > 25 && i <= 50) {
                        this.details2.push(blowDet);
                    } else if (i > 50 && i <= 75) {
                        this.details3.push(blowDet);
                    } else {
                        this.details4.push(blowDet);
                    }
                }
                var item = {};
                item.MachineSpinningIdentity = this.machineSpinning.Id;
                item.BlowingDetails = this.details1.concat(this.details2, this.details3, this.details4);
                item.Output = item.BlowingDetails.reduce((a, b) => +a + +b.Output, 0);
                if (this.machineSpinning.UomUnit.toUpperCase() == "KG") {
                    item.Bale = (item.Output / 181.44) * this.machineSpinning.Delivery;
                } else {
                    item.Bale = item.Output;
                }
                item.Eff = item.Bale * 100 / ((this.detailOptions.CountConfig.RPM * 345.6 * (22 / 7) * this.machineSpinning.Delivery) / (this.detailOptions.CountConfig.Ne * 307200)); // 60 * 24 * 0.24 & 400 * 768
                this.data.MachineSpinning = this.machineSpinning;
                this.data.CountConfig = this.detailOptions.CountConfig
                this.data.Items.push(item);
            }


            // this.detailOptions.MachineSpinning = this.MachineSpinning;
        } else if (!this.readOnly) {
            this.isItem = false;
        } else {
            this.isItem = true;
        }
    }


    inputDateChanged(n, o) {
        if (this.inputDate) {
            this.data.Date = this.inputDate;
            // this.fillItems();
        } else {
            this.data.Date = null;
            // this.data.Items = [];
        }
    }

    materialTypeChanged(n, o) {
        if (this.materialType && this.materialType.Id) {
            this.lotFilter = { "YarnTypeIdentity": this.materialType.Id };
            this.data.MaterialTypeId = this.materialType.Id;
            this.fillItems();
        } else {
            this.data.MaterialTypeId = null;
            // this.data.Items = [];
        }
    }

    async lotChanged(n, o) {

        if (this.lot && this.lot.Id) {

            let check = await this.service.validateLotInCount(this.lot.Id, this.processType);
            if (check) {
                if (this.error) {
                    this.error.LotId = undefined;
                }

                this.data.LotId = this.lot.Id;
                this.fillItems();
            } else {
                this.error.LotId = "Count is not created with this Lot";
            }

        } else {
            this.data.LotId = null;
            // this.data.Items = [];
        }
    }

    shiftChanged(n, o) {
        if (this.shift && this.shift != "") {
            this.data.Shift = this.shift;
            // this.fillItems();
        } else {
            this.data.Shift = null;
            // this.data.Items = [];
        }
    }

    groupChanged(n, o) {
        if (this.group && this.group != "") {
            this.data.Group = this.group;
            // this.fillItems();
        } else {
            this.data.Group = null;
            // this.data.Items = [];
        }

    }

    machineSpinningChanged(n, o) {
        if (this.machineSpinning && this.machineSpinning.Id) {
            this.machineName = this.machineSpinning.Name;


        } else {
            this.machineName = null;
        }

        this.fillItems();
    }

    get lotLoader() {
        //return LotLoader;
        return LotLoader;
    }

    get materialTypeLoader() {
        return MaterialTypeLoader;
    }

    get grandTotal() {
        if (this.data.Items) {
            return this.data.Items[0].BlowingDetails.reduce((a, b) => +a + +b.Output, 0);
        }
    }

    get grandTotalNett() {
        if (this.data.Items) {
            if (this.machineSpinning && this.machineSpinning.UomUnit.toUpperCase() == "KG") {
                var result = this.data.Items[0].BlowingDetails.reduce((a, b) => +a + +b.Output, 0);
                result = result - (1.6 * this.data.Items[0].BlowingDetails.filter(a => a.Output != 0).length);
                return result;
            } else {
                var result = this.data.Items[0].BlowingDetails.reduce((a, b) => +a + +b.Output, 0);
                result = result - (1600 * this.data.Items[0].BlowingDetails.filter(a => a.Output != 0).length);
                return result;
            }
        }
    }

    get grandTotalBale() {
        if (this.data.Items) {
            let outputDisplay = this.data.Items[0].BlowingDetails.reduce((a, b) => +a + +b.Output, 0);
            if (this.machineSpinning && this.machineSpinning.UomUnit.toUpperCase() == "KG") {

                return (outputDisplay / 181.44) * this.machineSpinning.Delivery;
            } else if (this.machineSpinning && this.machineSpinning.UomUnit.toUpperCase() == "GRAM") {
                return ((outputDisplay / 1000) / 181.44) * this.machineSpinning.Delivery;
            }
            else {
                return outputDisplay;
            }
        }
    }

    get grandTotalBaleNett() {
        if (this.data.Items) {
            let outputDisplay = 0;
            if (this.machineSpinning && this.machineSpinning.UomUnit.toUpperCase() == "KG") {
                var result = this.data.Items[0].BlowingDetails.reduce((a, b) => +a + +b.Output, 0);
                outputDisplay = result - (1.6 * this.data.Items[0].BlowingDetails.filter(a => a.Output != 0).length);
                
            } else {
                var result = this.data.Items[0].BlowingDetails.reduce((a, b) => +a + +b.Output, 0);
                outputDisplay = result - (1600 * this.data.Items[0].BlowingDetails.filter(a => a.Output != 0).length);
                
            }
            if (this.machineSpinning && this.machineSpinning.UomUnit.toUpperCase() == "KG") {

                return (outputDisplay / 181.44) * this.machineSpinning.Delivery;
            } else if (this.machineSpinning && this.machineSpinning.UomUnit.toUpperCase() == "GRAM") {
                return ((outputDisplay / 1000) / 181.44) * this.machineSpinning.Delivery;
            }
            else {
                return outputDisplay;
            }
        }
    }

    get grandEff() {
        if (this.data.Items && this.detailOptions.CountConfig && this.machineSpinning) {
            let baleDisplay = 0;
            let outputDisplay = this.data.Items[0].BlowingDetails.reduce((a, b) => +a + +b.Output, 0);
            if (this.machineSpinning && this.machineSpinning.UomUnit.toUpperCase() == "KG") {

                baleDisplay = (outputDisplay / 181.44) * this.machineSpinning.Delivery;
            } else if (this.machineSpinning && this.machineSpinning.UomUnit.toUpperCase() == "GRAM") {
                baleDisplay = ((outputDisplay / 1000) / 181.44) * this.machineSpinning.Delivery;
            } else {
                baleDisplay = outputDisplay;
            }
            return baleDisplay * 100 / ((this.detailOptions.CountConfig.RPM * 345.6 * (22 / 7) * this.machineSpinning.Delivery) / (this.detailOptions.CountConfig.Ne * 307200)); // 60 * 24 * 0.24 & 400 * 768
        }

    }

    get grandEffNett() {
        if (this.data.Items && this.detailOptions.CountConfig && this.machineSpinning) {
            let baleDisplay = 0;
            let outputDisplay = 0;
            if (this.machineSpinning && this.machineSpinning.UomUnit.toUpperCase() == "KG") {
                var result = this.data.Items[0].BlowingDetails.reduce((a, b) => +a + +b.Output, 0);
                outputDisplay = result - (1.6 * this.data.Items[0].BlowingDetails.filter(a => a.Output != 0).length);
                
            } else {
                var result = this.data.Items[0].BlowingDetails.reduce((a, b) => +a + +b.Output, 0);
                outputDisplay = result - (1600 * this.data.Items[0].BlowingDetails.filter(a => a.Output != 0).length);
                
            }
            if (this.machineSpinning && this.machineSpinning.UomUnit.toUpperCase() == "KG") {

                baleDisplay = (outputDisplay / 181.44) * this.machineSpinning.Delivery;
            } else if (this.machineSpinning && this.machineSpinning.UomUnit.toUpperCase() == "GRAM") {
                baleDisplay = ((outputDisplay / 1000) / 181.44) * this.machineSpinning.Delivery;
            }
            else {
                baleDisplay = outputDisplay;
            }

            return baleDisplay * 100 / ((this.detailOptions.CountConfig.RPM * 345.6 * (22 / 7) * this.machineSpinning.Delivery) / (this.detailOptions.CountConfig.Ne * 307200)); // 60 * 24 * 0.24 & 400 * 768
        }

    }

    get uomUnitDisplay() {
        if (this.machineSpinning) {
            return this.machineSpinning.UomUnit;
        }
        else {
            return "";
        }
    }

    get unitLoader() {
        return UnitLoader;
    }

    get machineSpinningLoader() {
        return MachineSpinningLoader;
    }

    unitChanged(newValue, oldValue) {

        if (this.unit && this.unit.Id) {
            this.data.UnitDepartmentId = this.unit.Id;
            this.machineSpinningFilter.UnitName = this.unit.Name;
            this.fillItems();
        } else {
            this.data.UnitDepartmentId = null;
        }
    }
}
