@login @smoke
Feature: Login en Mifarma UAT

  Como usuario QA
  Quiero iniciar sesión con mis credenciales válidas
  Para validar que el login funcione correctamente y continuar el flujo E2E

  Scenario: Login exitoso con correo, OTP y validación de documento
   #Given dado que ingreso a la pagina: "https://web-mifarma2-mfuat.cindibyinkafarma.com/"
    When hago clic en el botón de iniciar sesión
    And ingreso mis credenciales de usuario
    And obtengo el código OTP del mock y lo ingreso
    And selecciono el tipo de documento y completo mi número de DNI
    Then debo ver el mensaje de login exitoso o redirección al home
