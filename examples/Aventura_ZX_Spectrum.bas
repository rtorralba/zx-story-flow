10 REM = init global =
20 POKE 23693,0:BORDER 0:CLS
30 REM p() table of line pointers.
40 DIM p(10)
50 REM Inicializa variables del juego.
60 LET fkey=0:
70 REM 23675 for divider and selector.
80 POKE USR("A")+0,BIN 00000000:POKE USR("A")+1,BIN 00000000:POKE USR("A")+2,BIN 00000000:POKE USR("A")+3,BIN 00001000:POKE USR("A")+4,BIN 00011100:POKE USR("A")+5,BIN 00111110:POKE USR("A")+6,BIN 01111111:POKE USR("A")+7,BIN 11111111:POKE USR("B")+0,BIN 00000000:POKE USR("B")+1,BIN 00000000:POKE USR("B")+2,BIN 01000100:POKE USR("B")+3,BIN 01100110:POKE USR("B")+4,BIN 01110111:POKE USR("B")+5,BIN 01100110:POKE USR("B")+6,BIN 01000100:POKE USR("B")+7,BIN 00000000:
90 REM Va a primera pantalla
100 GO SUB 110:GO TO 130
110 REM Set default attributes
120 LET tattr=7:LET dattr=4:LET iattr=32:RETURN
130 REM-- - LaCarga ---
140 GO SUB 9988: 
150 BORDER 3 
160 PRINT "[[ PICTURE 1 ]] " '"[[ CLEAR ]]Es 1984. Estas sentado" '"frente al televisor. Los" '"chirridos de la cinta llenan la" '"habitacion: 'BIIIP... screech..." '"BIIP'."
170 PRINT ""
180 PRINT "De repente, el borde deja de" '"parpadear colores."
190 PRINT ""
200 LET n=n+1:LET p(n)=230:PRINT #1;"   Tocar el volumen"
210 LET n=n+1:LET p(n)=350:PRINT #1;"   Esperar con paciencia"
220 GO TO 9993
230 REM-- - Azimut ---
240 GO SUB 9988: 
250 BORDER 3 
260 PRINT "[[ CLEAR ]]Coges tu diminuto" '"destornillador amarillo." '"Giras el tornillo de azimut del" '"Datasette 0.01mm a la derecha."
270 PRINT ""
280 PRINT "El sonido cambia. Ha mejorado?"
290 PRINT ""
300 LET n=n+1:LET p(n)=470:PRINT #1;"   Si! Suena perfecto!"
310 LET n=n+1:LET p(n)=330:PRINT #1;"   Ups, ahora no suena"
320 GO TO 9993
330 REM Ups ahora no suena
340 LET fkey=0:GO TO 580
350 REM-- - Paciencia ---
360 GO SUB 9988: 
370 BORDER 3 
380 PRINT "Esperas." '"Pasan 5 minutos." '"Pasan 10 minutos." '"Tu te se enfria."
390 PRINT ""
400 PRINT "Finalmente aparece el mensaje: " '"'R Tape loading error, 0:1'."
410 PRINT ""
420 LET n=n+1:LET p(n)=450:PRINT #1;"   Rebobinar y reintentar"
430 LET n=n+1:LET p(n)=670:PRINT #1;"   Destrozar el teclado"
440 GO TO 9993
450 REM Rebobinar y reintentar
460 LET fkey=1:GO TO 580
470 REM-- - Exito ---
480 GO SUB 9988: 
490 BORDER 3 
500 PRINT "Un milagro! La pantalla de " '"titulo aparece pixel a pixel."
510 PRINT ""
520 PRINT "'JET SET WILLY'"
530 PRINT ""
540 PRINT "Input Type: KEMPSTON." '"Juegas hasta que la fuente" '"derrite la alfombra."
550 PRINT ""
560 LET n=n+1:LET p(n)=130:PRINT #1;"   Jugar otro juego"
570 GO TO 9993
580 REM-- - Silencio ---
590 GO SUB 9988: 
600 BORDER 3 
610 PRINT "Giraste el tornillo demasiado. El" '"cabezal esta desalineado." '"Rompiste el datasette."
620 PRINT ""
630 IF fkey=1 THEN PRINT "Ahora tienes que escuchar a tus" '"padres hablar de politica en vez" '"de jugar."
640 PRINT ""
650 LET n=n+1:LET p(n)=130:PRINT #1;"   Irse a dormir"
660 GO TO 9993
670 REM-- - Rabia ---
680 GO SUB 9988: 
690 BORDER 3 
700 PRINT "Golpeas las teclas de goma con" '"frustracion." '"Una tecla sale volando y golpea" '"al gato." '"El gato te arana."
710 PRINT ""
720 PRINT "GAME OVER."
730 PRINT ""
740 PRINT ""
750 LET n=n+1:LET p(n)=130:PRINT #1;"   Intentar de nuevo"
760 GO TO 9993
9988 REM New screen. Clear and set attributes.
9989 POKE 23693,tattr:POKE 23624,dattr:CLS:POKE 23659,1:PRINT #1;AT 0,0;"{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}":POKE 23624,iattr:
9990 LET n=0:REM contador opciones.
9991 LET i=1
9992 RETURN
9993 REM choose an option
9994 IF NOT n THEN PRINT #1;"  FIN  -  PRESS ANY KEY":PAUSE 1:PAUSE 0:GO TO 0:
9995 PRINT #1;AT i,1;"{B}";:PAUSE 1:PAUSE 0:LET k=PEEK 23560:PRINT #1;AT i,1;" ";:
9996 IF k=10 THEN LET i=i+1-(n AND i=n)
9997 IF k=11 THEN LET i=i-1+(n AND i=1)
9998 IF k=13 THEN GO SUB 110:GO TO p(i)
9999 GO TO 9993
