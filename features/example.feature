Feature: Ingreso a Inkafarma
  Quiero ingresar a la web de Inkafarma
  Para validar que la página carga correctamente

  @smoke
  Scenario: Validar carga inicial del home de Inkafarma
    Given que ingreso al sitio "https://inkafarma.pe/"
    When espero que la página cargue completamente
    Then el título debe contener "Inkafarma"

  Scenario: Flujo completo de compra sin login hasta agregar 2 unidades
    Given que ingreso el código "036781" en el buscador de producto
    Then visualizo el producto en la lista con su nombre y precio
    When ingreso al detalle del producto desde la lista
    Then verifico el nombre y precio del producto en el detalle
    When agrego el producto al carrito
    And aumento la cantidad a 4 unidades
    Then tomo una captura final validando que se aumento a 4 los productos

