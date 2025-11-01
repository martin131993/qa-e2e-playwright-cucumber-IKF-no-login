Feature: Ingreso a Mifarma UAT
  Quiero ingresar a la web de Inkafarma en ambiente UAT
  Para validar que la página carga correctamente

  @smoke
  Scenario: Validar carga inicial del home de Inkafarma
    Given que ingreso al sitio "https://web-mifarma2-mfuat.cindibyinkafarma.com/"
    When espero que la página cargue completamente
    Then el título debe contener "Mifarma"

