10 REM = one-time init =
20 CLEAR 58455:LOAD "dark" CODE 58455:SAVE! "dark" CODE 58455,6912:
30 REM = init global =
40 POKE 23693,0:BORDER 0:CLS
50 REM p() table of line pointers.
60 DIM p(10)
70 REM Inicializa variables del juego.
80 LET fkey=0:
90 REM 23675 for divider and selector.
100 POKE USR("A")+0,BIN 00000000:POKE USR("A")+1,BIN 00000000:POKE USR("A")+2,BIN 00000000:POKE USR("A")+3,BIN 00001000:POKE USR("A")+4,BIN 00011100:POKE USR("A")+5,BIN 00111110:POKE USR("A")+6,BIN 01111111:POKE USR("A")+7,BIN 11111111:POKE USR("B")+0,BIN 00000000:POKE USR("B")+1,BIN 00000000:POKE USR("B")+2,BIN 01000100:POKE USR("B")+3,BIN 01100110:POKE USR("B")+4,BIN 01110111:POKE USR("B")+5,BIN 01100110:POKE USR("B")+6,BIN 01000100:POKE USR("B")+7,BIN 00000000:
110 REM Va a primera pantalla
120 GO SUB 130:GO TO 150
130 REM Set default attributes
140 LET tattr=7:LET dattr=4:LET iattr=32:RETURN
150 REM-- - LaCarga ---
160 BORDER 0 
170 GO SUB 9990:
180 LOAD! "dark" CODE 16384:PRINT AT 8,0:
190 GO SUB 9985:
200 PRINT ""
210 PRINT ""
220 PRINT ""
230 PRINT ""
240 PRINT ""
250 PRINT ""
260 PRINT ""
270 PRINT ""
280 PRINT "Es 1984. Estas sentado frente al" '"televisor. Los chirridos de la " '"cinta llenan la habitacion: "
290 PRINT ""
300 PRINT "'BIIIP... screech... BIIP'."
310 PRINT ""
320 PRINT "De repente, el borde deja de " '"parpadear colores." '"De repente, el borde deja de " '"parpadear colores." '"De repente, el borde deja de " '"parpadear colores." '"De repente, el borde deja de " '"parpadear colores." '"parpadear colores.";
330 PRINT ""
340 LET n=n+1:LET p(n)=370:PRINT #1;"   Tocar el volumen"
350 LET n=n+1:LET p(n)=490:PRINT #1;"   Esperar con paciencia"
360 GO TO 9993
370 REM-- - Azimut ---
380 BORDER 0 
390 GO SUB 9988:
400 PRINT "[[ CLEAR ]]Coges tu diminuto" '"destornillador amarillo." '"Giras el tornillo de azimut del" '"Datasette 0.01mm a la derecha."
410 PRINT ""
420 PRINT "El sonido cambia. Ha mejorado?";
430 PRINT ""
440 LET n=n+1:LET p(n)=610:PRINT #1;"   Si! Suena perfecto!"
450 LET n=n+1:LET p(n)=470:PRINT #1;"   Ups, ahora no suena"
460 GO TO 9993
470 REM Ups ahora no suena
480 LET fkey=0:GO TO 720
490 REM-- - Paciencia ---
500 BORDER 0 
510 GO SUB 9988:
520 PRINT "                     Esperas." '"Pasan 5 minutos." '"Pasan 10 minutos." '"Tu te se enfria."
530 PRINT ""
540 PRINT "Finalmente aparece el mensaje: " '"'R Tape loading error, 0:1'.";
550 PRINT ""
560 LET n=n+1:LET p(n)=590:PRINT #1;"   Rebobinar y reintentar"
570 LET n=n+1:LET p(n)=810:PRINT #1;"   Destrozar el teclado"
580 GO TO 9993
590 REM Rebobinar y reintentar
600 LET fkey=1:GO TO 720
610 REM-- - Exito ---
620 BORDER 0 
630 GO SUB 9988:
640 PRINT "Un milagro! La pantalla de " '"titulo aparece pixel a pixel."
650 PRINT ""
660 PRINT "'JET SET WILLY'"
670 PRINT ""
680 PRINT "Input Type: KEMPSTON." '"Juegas hasta que la fuente" '"derrite la alfombra.";
690 PRINT ""
700 LET n=n+1:LET p(n)=720:PRINT #1;"   Jugar otro juego"
710 GO TO 9993
720 REM-- - Silenciosfssrgfsrgfsr ---
730 BORDER 0 
740 GO SUB 9988:
750 PRINT "Giraste el tornillo demasiado." '"El cabezal esta desalineado." '"Rompiste el datasette."
760 PRINT ""
770 IF fkey=1 THEN PRINT "Ahora tienes que escuchar a tus" '"padres hablar de politica en vez" '"de jugar.";
780 PRINT ""
790 LET n=n+1:LET p(n)=720:PRINT #1;"   Irse a dormir"
800 GO TO 9993
810 REM-- - Rabia ---
820 BORDER 0 
830 GO SUB 9988:
840 PRINT "[[CLEAR]] Golpeas las teclas de " '"goma con frustracion."
850 PRINT ""
860 PRINT "Una tecla sale volando y golpea " '"al gato."
870 PRINT ""
880 PRINT "El gato te arana."
890 PRINT ""
900 PRINT "GAME OVER.";
910 PRINT ""
920 PRINT ""
930 LET n=n+1:LET p(n)=720:PRINT #1;"   Intentar de nuevo"
940 GO TO 9993
9985 REM Option bar subroutine (also called after image load).
9986 POKE 23624,dattr:POKE 23659,1:PRINT #1;AT 0,0;"{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}{A}":POKE 23624,iattr:LET n=0:LET i=1:RETURN
9988 REM New screen. CLS + option bar (no image).
9989 POKE 23693,tattr:POKE 23624,dattr:CLS:GO SUB 9985:RETURN
9990 REM New screen. CLS only (image will follow).
9991 POKE 23693,tattr:POKE 23624,dattr:CLS:RETURN
9993 REM choose an option
9994 IF NOT n THEN PRINT #1;"  FIN  -  PRESS ANY KEY":PAUSE 1:PAUSE 0:GO TO 0:
9995 PRINT #1;AT i,1;"{B}";:PAUSE 1:PAUSE 0:LET k=PEEK 23560:PRINT #1;AT i,1;" ";:
9996 IF k=10 THEN LET i=i+1-(n AND i=n)
9997 IF k=11 THEN LET i=i-1+(n AND i=1)
9998 IF k=13 THEN GO SUB 130:GO TO p(i)
9999 GO TO 9993
