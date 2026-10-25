const test = require('node:test');
const assert = require('node:assert/strict');
const { procesarDatosFinancieros } = require('../backend/src/services/financeService');
const {
    esTextoValido,
    esTextoOpcionalValido,
    esMontoPositivoValido,
    esEnteroPositivoValido
} = require('../backend/src/utils/validators');

test('Cálculo financiero diario con efectivo, transferencias, domicilios, gastos e ingresos extras', () => {
    const datasetSimulado = {
        saldoInicial: 50.0,
        ordenes: [
            {
                id: 1,
                cliente: 'Juan Perez',
                total: 10.0,
                tipo_entrega: 'mesa',
                metodo_pago: 'efectivo',
                estado: 'listo',
                detalles: [{ nombre: 'Hamburguesa Clasica', cantidad: 2 }]
            },
            {
                id: 2,
                cliente: 'Maria Lopez',
                total: 8.5, // incluye $1.00 de domicilio
                tipo_entrega: 'domicilio',
                metodo_pago: 'efectivo',
                estado: 'entregado',
                detalles: [{ nombre: 'Combo De La Casa', cantidad: 1 }]
            },
            {
                id: 3,
                cliente: 'Carlos Ruiz',
                total: 12.0, // pagado por transferencia con domicilio
                tipo_entrega: 'domicilio',
                metodo_pago: 'transferencia',
                estado: 'listo',
                detalles: [{ nombre: 'Hamburguesa Doble Queso', cantidad: 2 }]
            },
            {
                id: 4,
                cliente: 'Ana Cocina',
                total: 0,
                tipo_entrega: 'personal',
                metodo_pago: 'efectivo',
                estado: 'listo',
                detalles: [{ nombre: 'Hamburguesa Clasica', cantidad: 1 }]
            },
            {
                id: 5,
                cliente: 'Orden Cancelada',
                total: 6.0,
                tipo_entrega: 'retiro',
                metodo_pago: 'efectivo',
                estado: 'anulado',
                detalles: [{ nombre: 'Hamburguesa Doble Queso', cantidad: 1 }]
            }
        ],
        gastos: [
            { id: 1, descripcion: 'Compra de hielo', monto: 3.5 },
            { id: 2, descripcion: 'Servilletas', monto: 2.0 }
        ],
        extras: [
            { id: 1, descripcion: 'Cambio adicional', monto: 15.0 }
        ],
        platos: [
            { nombre: 'Hamburguesa Clasica', stock: 17, id_padre: null },
            { nombre: 'Combo De La Casa', stock: 9, id_padre: null },
            { nombre: 'Hamburguesa Doble Queso', stock: 8, id_padre: null }
        ]
    };

    const resultado = procesarDatosFinancieros(datasetSimulado);

    // Ventas totales válidas (10.0 + 8.5 + 12.0 = 30.5)
    assert.equal(resultado.ventas, 30.5);
    assert.equal(resultado.ventasEfectivo, 18.5);
    assert.equal(resultado.ventasEfectivoNeto, 17.5); // 18.5 - 1.00 domicilio en efectivo
    assert.equal(resultado.ventasTransferencia, 12.0);
    assert.equal(resultado.cantidadTransferencias, 1);
    assert.equal(resultado.pedidosDomicilio, 2);
    assert.equal(resultado.totalDomicilios, 2.0);
    assert.equal(resultado.totalDomiciliosEfectivo, 1.0);
    assert.equal(resultado.totalGastos, 5.5);
    assert.equal(resultado.totalIngresosExtras, 15.0);
    assert.equal(resultado.anulado, 6.0);
    assert.equal(resultado.validas, 4);

    // Dinero en caja física = Saldo Inicial (50) + Ventas Efectivo (18.5) + Extras (15.0) - Gastos (5.5) = 78.0
    assert.equal(resultado.dineroEnCaja, 78.0);

    // Verificación de inventario del día (inicial = stock final + vendidos + consumo personal)
    const platoClasica = resultado.platosDia.find(p => p.nombre === 'Hamburguesa Clasica');
    assert.deepEqual(platoClasica, {
        nombre: 'Hamburguesa Clasica',
        inicial: 20,
        vendidos: 2,
        consumo: 1,
        final: 17
    });
});

test('Cálculo de cierre de caja sin movimientos mantiene el saldo inicial intacto', () => {
    const resultado = procesarDatosFinancieros({
        saldoInicial: 120.25,
        ordenes: [],
        gastos: [],
        extras: [],
        platos: []
    });

    assert.equal(resultado.dineroEnCaja, 120.25);
    assert.equal(resultado.ventas, 0);
    assert.equal(resultado.totalGastos, 0);
    assert.equal(resultado.totalIngresosExtras, 0);
});

test('Validadores de entrada rechazan símbolos, negativos y decimales inválidos', () => {
    assert.equal(esTextoValido('Compra de hielo'), true);
    assert.equal(esTextoValido('Hielo 123'), false);
    assert.equal(esTextoValido('Hielo $5'), false);

    assert.equal(esTextoOpcionalValido('Sin cebolla'), true);
    assert.equal(esTextoOpcionalValido(''), true);
    assert.equal(esTextoOpcionalValido('Mesa #4'), false);

    assert.equal(esMontoPositivoValido('12.50'), true);
    assert.equal(esMontoPositivoValido('0.99'), true);
    assert.equal(esMontoPositivoValido('-5.00'), false);
    assert.equal(esMontoPositivoValido('0'), false);
    assert.equal(esMontoPositivoValido('10.999'), false);

    assert.equal(esEnteroPositivoValido(15), true);
    assert.equal(esEnteroPositivoValido(0), false);
    assert.equal(esEnteroPositivoValido(-3), false);
    assert.equal(esEnteroPositivoValido(4.5), false);

    const { esEnteroNoNegativoValido } = require('../backend/src/utils/validators');
    assert.equal(esEnteroNoNegativoValido(0), true);
    assert.equal(esEnteroNoNegativoValido('0'), true);
    assert.equal(esEnteroNoNegativoValido(25), true);
    assert.equal(esEnteroNoNegativoValido(-1), false);
    assert.equal(esEnteroNoNegativoValido('abc'), false);
});


test('Cálculo de orden en orderService contempla envíos a domicilio y consumo personal', () => {
    const { calcularTotalOrden } = require('../backend/src/services/orderService');
    const detalles = [
        { precio: 5.5, cantidad: 2 },
        { precio: 3.0, cantidad: 1 }
    ];

    assert.equal(calcularTotalOrden({ detalles, tipo_entrega: 'mesa' }), 14.0);
    assert.equal(calcularTotalOrden({ detalles, tipo_entrega: 'domicilio' }), 15.0);
    assert.equal(calcularTotalOrden({ detalles, tipo_entrega: 'domicilio', es_extra: true }), 14.0);
    assert.equal(calcularTotalOrden({ detalles, tipo_entrega: 'personal' }), 0);
});

test('Paginación de historial de movimientos calcula rangos y páginas correctamente', () => {
    const { calcularMetaPaginacion } = require('../backend/src/services/reportService');

    const pagina1 = calcularMetaPaginacion(25, 1, 10);
    assert.equal(pagina1.page, 1);
    assert.equal(pagina1.limit, 10);
    assert.equal(pagina1.totalItems, 25);
    assert.equal(pagina1.totalPages, 3);
    assert.equal(pagina1.hasPrevPage, false);
    assert.equal(pagina1.hasNextPage, true);
    assert.equal(pagina1.from, 0);
    assert.equal(pagina1.to, 9);

    const pagina3 = calcularMetaPaginacion(25, 3, 10);
    assert.equal(pagina3.page, 3);
    assert.equal(pagina3.hasPrevPage, true);
    assert.equal(pagina3.hasNextPage, false);
    assert.equal(pagina3.from, 20);
    assert.equal(pagina3.to, 29);
});

test('errorHandler distingue 401 sin token de 403 con token ante errores RLS', () => {
    const { errorHandler } = require('../backend/src/app');

    const crearResMock = () => {
        const res = {
            headersSent: false,
            statusCode: 200,
            payload: null,
            setHeader() {},
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(body) {
                this.payload = body;
                return this;
            }
        };
        return res;
    };

    const errRls = new Error('new row violates row-level security policy for table "categorias"');

    const resSinToken = crearResMock();
    errorHandler(errRls, { method: 'POST', originalUrl: '/categorias' }, resSinToken, () => {});
    assert.equal(resSinToken.statusCode, 401);

    const resConToken = crearResMock();
    errorHandler(
        errRls,
        { method: 'POST', originalUrl: '/categorias', accessToken: 'valid-jwt-token' },
        resConToken,
        () => {}
    );
    assert.equal(resConToken.statusCode, 403);
});

