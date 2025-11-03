Feature: Ingreso a Inkafarma
  Quiero ingresar a la web de Inkafarma
  Para validar que la página carga correctamente

  @smoke
  Scenario: Validar carga inicial del home de Inkafarma
    Given que ingreso al sitio "https://inkafarma.pe/"
    When espero que la página cargue completamente
    Then el título debe contener "Inkafarma"


  Scenario: Agregar múltiples productos y avanzar hasta checkout
    Given que ingreso y agrego los siguientes productos al carrito:
      | codigo | cantidad |
      | 072832 | 1 |
      | 003414 | 2 |
      | 020773 | 3 |
    Then ingreso al carrito y avanzo hasta el checkout sin iniciar sesión

